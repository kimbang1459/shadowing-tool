#!/usr/bin/env python3
"""
영상 파일에서 음원을 추출하는 스크립트
사용법: python3 extract.py 영상파일.mp4
"""

import sys
import subprocess
import os

def extract_audio(video_path):
    if not os.path.exists(video_path):
        print(f"오류: 파일을 찾을 수 없어요 → {video_path}")
        sys.exit(1)

    base = os.path.splitext(video_path)[0]
    output_path = base + ".mp3"

    print(f"음원 추출 중: {video_path} → {output_path}")

    result = subprocess.run([
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "libmp3lame",
        "-q:a", "2",
        output_path
    ], capture_output=True, text=True)

    if result.returncode != 0:
        print("오류 발생:")
        print(result.stderr)
        sys.exit(1)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"완료! {output_path} ({size_mb:.1f} MB)")
    print("이제 이 파일을 AirDrop 또는 iCloud로 폰에 전송하세요.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: python3 extract.py 영상파일.mp4")
        sys.exit(1)
    extract_audio(sys.argv[1])
