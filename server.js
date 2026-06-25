const express = require('express');
const cors = require('cors');
const YTDlpWrap = require('yt-dlp-wrap').default;
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const ytDlpPath = path.join(__dirname, 'yt-dlp.exe');
const ytDlpWrap = new YTDlpWrap();

// 💡 서버 시작 시 유튜브 다운로더 엔진(yt-dlp.exe)이 없으면 자동으로 받아주는 안전장치
async function initYtdlp() {
    if (!fs.existsSync(ytDlpPath)) {
        console.log("⏳ 유튜브 다운로드 엔진(yt-dlp)이 없습니다. 다운로드를 시작합니다...");
        try {
            await YTDlpWrap.downloadFromGithub(ytDlpPath);
            console.log("✅ yt-dlp 다운로드 완료!");
        } catch (err) {
            console.error("❌ yt-dlp 다운로드 실패. 네트워크를 확인하세요:", err);
        }
    }
    ytDlpWrap.setBinaryPath(ytDlpPath);
}
initYtdlp();

app.post('/api/cut', async (req, res) => {
    const { url, start, duration } = req.body;
    
    const inputPath = path.join(__dirname, 'input.mp4');
    const outputPath = path.join(__dirname, 'output.mp4');

    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    try {
        console.log(`[요청 수신] URL: ${url} / 시작: ${start}초 / 길이: ${duration}초`);
        console.log("1. 원본 영상 다운로드 중... (영상이 길면 수십 초 소요될 수 있습니다)");
        
        // 원본 영상 가져오기
        await ytDlpWrap.execPromise([url, '-f', 'mp4', '-o', inputPath]);
        console.log("✅ 원본 다운로드 완료");

        console.log("2. 지정 구간 자르기 작업 시작...");
        
        // 컴퓨터에 설치된 FFmpeg을 호출하여 비디오 컷팅
        ffmpeg(inputPath)
            .setStartTime(start)
            .setDuration(duration)
            .output(outputPath)
            .on('end', () => {
                console.log("✅ 컷팅 성공! 브라우저로 전송합니다.");
                res.download(outputPath, 'highlight.mp4');
            })
            .on('error', (err) => {
                console.error("❌ FFmpeg 처리 에러:", err.message);
                res.status(500).json({ error: "FFmpeg 커팅 실패. PC에 FFmpeg이 설치되어 있는지 확인하세요." });
            })
            .run();

    } catch (error) {
        console.error("❌ 유튜브 추출 단계 에러:", error);
        res.status(500).json({ error: "유튜브 다운로드 실패" });
    }
});

app.listen(3000, () => console.log('🚀 [포트 3000] 하이라이트 백엔드 서버 가동 시작!'));
