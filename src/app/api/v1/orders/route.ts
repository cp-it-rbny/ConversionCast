import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

/**
 * Mock Ticket Provider API
 * Returns the test_run.json data provided by the user.
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "test_run.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const mockOrders = JSON.parse(fileContent);

    return NextResponse.json({
      data: mockOrders,
      count: mockOrders.length,
      hasMoreRecords: false
    });
  } catch (err) {
    console.error("Error reading test_run.json", err);
    return NextResponse.json({ error: "Failed to read test data" }, { status: 500 });
  }
}
