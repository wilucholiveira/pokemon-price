import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error,
      },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json({
      success: true,
      message: "Callback do Mercado Livre funcionando.",
    });
  }

  return NextResponse.json({
    success: true,
    message: "Authorization Code recebido.",
  });
}