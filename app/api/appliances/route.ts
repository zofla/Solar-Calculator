import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { Appliance } from "@/lib/types";

export async function GET() {
  try {
    if (!db) {
      const mock: Appliance[] = [
        { name: "LED Bulb 10W", power: 10, hours: 6, quantity: 1 },
        { name: "TV", power: 120, hours: 5, quantity: 1 },
        { name: "Fridge", power: 150, hours: 24, quantity: 1 },
      ];
      return NextResponse.json({ appliances: mock });
    }

    const snapshot = await db.collection("appliances").get();
    const appliances: Appliance[] = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        name: data.name || "",
        power: Number(data.power) || 0,
        hours: Number(data.hours) || 0,
        quantity: Number(data.quantity) || 0,
      };
    });

    return NextResponse.json({ appliances });
  } catch (error) {
    console.error("Error in /api/appliances:", error);
    return NextResponse.json(
      { error: "Failed to fetch appliances" },
      { status: 500 }
    );
  }
}
