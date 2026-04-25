import { Client } from "@gradio/client";

// Định nghĩa cấu trúc trả về để lấy gợi ý code (Intellisense)
interface LPRResult {
  data: [
    { url: string; [key: string]: any }, // Object chứa ảnh đã xử lý
    string                               // Chữ số biển số xe
  ];
}

export async function processLicensePlate(image: File | Blob): Promise<string> {
  try {
    const client = await Client.connect("tpc-pascal/LPR");
    const result = await client.predict("/process_image", {
      input_img: image,
    }) as LPRResult | { data: any[] };

    if (!result?.data || !Array.isArray(result.data)) {
      throw new Error("LPR API trả về dữ liệu không hợp lệ");
    }

    const plateCandidate = result.data[1] ?? result.data[0];
    if (typeof plateCandidate !== "string") {
      throw new Error("Không xác định được biển số từ API");
    }

    return plateCandidate;
  } catch (error) {
    console.error("LPR API Error:", error);
    throw error;
  }
}