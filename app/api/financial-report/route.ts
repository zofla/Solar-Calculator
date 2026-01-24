import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type FinancialRow = {
  yr: number;
  rep: number;
  rpp: number;
  po: number;
  ast: number;
  asp: number;
  tas: number;
  csr: number;
  ei: number;
  cc: number;
  roi: number;
  cs_less_cc: number;
};

type CalculationResult = {
  totalSystemCost: number;
  totalPower?: number;
  totalEnergy?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: FinancialRow[] = body.rows || [];
    const calculation: CalculationResult = body.calculation || {};
    const monthlySpend: number = body.monthlySpend || 0;
    const weeklyPetrol: number = body.weeklyPetrol || 0;

    if (!rows.length) {
      return new NextResponse('No financial rows provided', { status: 400 });
    }

    const breakEvenRow = rows.find((r) => r.cs_less_cc >= 0);
    const breakEvenYear = breakEvenRow?.yr ?? rows[rows.length - 1].yr;
    const year25Data = rows.find((r) => r.yr === 25) || rows[rows.length - 1];

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    let y = height - 60;

    const sanitize = (text: string) => text.replace(/₦/g, 'NGN ');

    const drawText = (
      text: string,
      options: { x?: number; size?: number; bold?: boolean; color?: any } = {}
    ) => {
      const {
        x = 50,
        size = 12,
        bold = false,
        //color = rgb(1, 1, 1),
        color = rgb(0, 0, 0),
      } = options;

      page.drawText(sanitize(text), {
        x,
        y,
        size,
        font: bold ? fontBold : font,
        color,
      });
      y -= size + 4;
    };


    // Title
    drawText('Solar Financial Report', {
      x: 50,
      size: 20,
      bold: true,
      color: rgb(0.3, 0.9, 0.7),
    });
    y -= 8;

    // Inputs / overview
    drawText(
      `Monthly electricity spend: ₦${monthlySpend.toLocaleString('en-NG')}`,
      { size: 12 }
    );
    drawText(
      `Weekly petrol/diesel spend: ₦${weeklyPetrol.toLocaleString('en-NG')}`,
      { size: 12 }
    );

    if (calculation.totalSystemCost) {
      drawText(
        `Initial solar system investment: ₦${calculation.totalSystemCost.toLocaleString('en-NG')}`,
        { size: 12 }
      );
    }
    if (calculation.totalPower) {
      drawText(`Total connected load: ${calculation.totalPower} W`, { size: 12 });
    }
    if (calculation.totalEnergy) {
      drawText(`Total daily energy: ${calculation.totalEnergy} Wh/day`, { size: 12 });
    }

    y -= 10;

    // Highlights
    drawText('Key Financial Highlights', {
      size: 14,
      bold: true,
      color: rgb(0.8, 0.9, 1),
    });

    drawText(`Estimated break-even year: Year ${breakEvenYear}`, { size: 12 });
    drawText(
      `Cumulative savings at year 25: ₦${year25Data.csr.toLocaleString('en-NG')}`,
      { size: 12 }
    );
    drawText(
      `Cumulative investment at year 25: ₦${year25Data.cc.toLocaleString('en-NG')}`,
      { size: 12 }
    );
    drawText(`ROI at year 25: ${year25Data.roi.toFixed(2)}%`, { size: 12 });

    y -= 10;

    // Summary table header
    drawText('Year-by-Year Projection (summary)', {
      size: 14,
      bold: true,
      color: rgb(0.8, 0.9, 1),
    });
    y -= 4;

    const headerSize = 10;
    drawText(
      'Year | Cum. Savings (₦) | Cum. Cost (₦) | ROI (%) | Cum. Sav. - Cost (₦)',
      { size: headerSize }
    );

    y -= headerSize + 2;

    // Table rows (truncate to avoid overflowing page)
    const maxRowsOnPage = 26; // you have 0–25 years, fits fine
    const rowsToRender = rows.slice(0, maxRowsOnPage);

    rowsToRender.forEach((r) => {
      if (y < 60) {
        // new page if needed
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        page.drawText(''); // keep TS happy
        y = height - 60;
      }

      const line =
        `${r.yr.toString().padStart(2, '0')}  |  ` +
        `₦${r.csr.toLocaleString('en-NG')}  |  ` +
        `₦${r.cc.toLocaleString('en-NG')}  |  ` +
        `${r.roi.toFixed(2)}%  |  ` +
        `₦${r.cs_less_cc.toLocaleString('en-NG')}`;

      drawText(line, { size: 9 });
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="solar-financial-report.pdf"',
      },
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return new NextResponse('Failed to generate PDF', { status: 500 });
  }
}