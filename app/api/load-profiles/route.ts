import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import type { SubCategory } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "Residential";

    if (!db) {
      // Fallback mock if Firebase is not configured
      const mock: SubCategory[] = [
        {
          name: "Sample Profile",
          description: "Mock profile because Firebase is not configured.",
          appliances: [
            { name: "LED Bulb 10W", power: 10, hours: 6, quantity: 6 },
            { name: "TV", power: 120, hours: 5, quantity: 1 },
          ],
        },
      ];
      return NextResponse.json({ subCategories: mock, appliances: mock.flatMap(s => s.appliances) });
    }

    const docSnap = await db.collection("loadProfiles").doc(category).get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { subCategories: [], appliances: [] },
        { status: 200 }
      );
    }

    const data = docSnap.data() || {};
    const subCategories = (data.subCategories || []) as SubCategory[];
    const appliances = subCategories.flatMap((sc) => sc.appliances || []);

    return NextResponse.json({ subCategories, appliances });
  } catch (error) {
    console.error("Error in /api/load-profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch load profiles" },
      { status: 500 }
    );
  }
}
