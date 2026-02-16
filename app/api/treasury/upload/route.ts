import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createSupabaseServiceRoleClient } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "Keine Datei übermittelt." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const cellRef = process.env.TREASURY_EXCEL_CELL || "B2";
    const cell = sheet[cellRef];

    if (!cell || typeof cell.v === "undefined") {
      return NextResponse.json(
        { message: `Keine Zahl in Zelle ${cellRef} gefunden.` },
        { status: 400 }
      );
    }

    const amount = Number(cell.v);
    if (Number.isNaN(amount)) {
      return NextResponse.json(
        { message: `Wert in ${cellRef} ist keine Zahl.` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    const { error } = await supabase.from("treasury_updates").insert({
      amount,
      source: "Excel Upload"
    });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { message: "Fehler beim Speichern in der Datenbank." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Kassenstand aktualisiert auf ${amount.toLocaleString("de-DE")} €`
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Unerwarteter Fehler beim Upload." },
      { status: 500 }
    );
  }
}

