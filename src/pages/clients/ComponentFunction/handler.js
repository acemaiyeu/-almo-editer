const axios = require('axios');
const { PollyClient, SynthesizeSpeechCommand } = require("@aws-sdk/client-polly");

const polly = new PollyClient({ region: "ap-southeast-1" });

module.exports.tts = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const text = body.text;

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Văn bản không được để trống" }),
      };
    }

    // 1. Gọi Ollama dùng model llama3.2:1b siêu nhẹ
    let optimizedText = text;
    try {
      const llamaResponse = await axios.post('http://localhost:11434/api/generate', {
        model: 'llama3.2:1b', // <-- Cập nhật ở đây
        prompt: `Bạn là trợ lý tiếng Việt. Hãy chuẩn hóa văn bản sau để đọc TTS tự nhiên hơn (sửa lỗi chính tả, thêm dấu ngắt nghỉ). CHỈ trả về văn bản đã sửa:\n\n${text}`,
        stream: false,
        options: {
          num_predict: 250, // Giới hạn token để phản hồi nhanh hơn nữa
        }
      }, { timeout: 8000 });

      if (llamaResponse.data && llamaResponse.data.response) {
        optimizedText = llamaResponse.data.response.trim();
      }
    } catch (ollamaErr) {
      console.warn("Ollama llama3.2:1b gặp sự cố, dùng lại văn bản gốc:", ollamaErr.message);
      // Fallback giữ nguyên text gốc nếu Ollama bận
    }

    // 2. Chuyển thành giọng nói qua AWS Polly (hoặc TTS local)
    const command = new SynthesizeSpeechCommand({
      Text: optimizedText,
      OutputFormat: "mp3",
      VoiceId: "Thi",
      LanguageCode: "vi-VN",
    });

    const response = await polly.send(command);
    const audioBytes = await response.AudioStream.transformToByteArray();
    const base64Audio = Buffer.from(audioBytes).toString("base64");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audio: `data:audio/mp3;base64,${base64Audio}`,
        processedText: optimizedText
      }),
    };

  } catch (error) {
    console.error("Lỗi Lambda Handler:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Lỗi xử lý hệ thống" }),
    };
  }
};