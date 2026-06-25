export default {
  async fetch(request, env, ctx) {
    // 1. CORS 프리플라이트 요청 처리 (모든 브라우저 차단 우회)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method === "POST") {
      try {
        const { url, start, end } = await request.json();

        if (!url || start === undefined || end === undefined) {
          return new Response(JSON.stringify({ success: false, message: "필수 입력값이 누락되었습니다." }), {
            status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

        // 2. 안정적인 외부 영상 처리 서버(Cobalt)에 자르기 요청 위임
        const cobaltResponse = await fetch("https://api.cobalt.tools/api/json", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            url: url,
            videoQuality: "720",
            downloadMode: "cut", // 자르기 모드 활성화
            cutStart: start.toString(), // 시작 시간 (초)
            cutEnd: end.toString()      // 종료 시간 (초)
          })
        });

        const cobaltData = await cobaltResponse.json();

        // 3. 추출된 다운로드 링크를 프론트엔드로 안전하게 배달
        if (cobaltData && cobaltData.url) {
          return new Response(JSON.stringify({ success: true, downloadUrl: cobaltData.url }), {
            status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        } else {
          return new Response(JSON.stringify({ success: false, message: "영상 추출에 실패했습니다." }), {
            status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }

      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), {
          status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
