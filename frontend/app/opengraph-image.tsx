import { ImageResponse } from "next/og"
import { join } from "node:path"
import { readFile } from "node:fs/promises"

export const alt = "توپ‌سِت (ToopSet) | رزرو آنلاین زمین‌های ورزشی"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const fontBold = await readFile(
  join(process.cwd(), "public/fonts/iran-yekan-x/IRANYekanX-Bold.woff2")
)
const fontRegular = await readFile(
  join(process.cwd(), "public/fonts/iran-yekan-x/IRANYekanX-Regular.woff2")
)

export default async function Image() {
  return new ImageResponse(
    <div
      dir="rtl"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 60px",
        background: "linear-gradient(135deg, #0b1220 0%, #16223a 100%)",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            textAlign: "center",
            fontFamily: "IranYekanX",
          }}
        >
          توپ‌سِت (ToopSet)
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 400,
            textAlign: "center",
            color: "#cbd5e1",
            fontFamily: "IranYekanX",
          }}
        >
          رزرو آنلاین زمین‌های ورزشی در قم
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "IranYekanX", data: fontBold, style: "normal", weight: 700 },
        {
          name: "IranYekanX",
          data: fontRegular,
          style: "normal",
          weight: 400,
        },
      ],
    }
  )
}
