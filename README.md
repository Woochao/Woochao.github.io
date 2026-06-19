# 자기소개 사이트

순수 HTML/CSS/JS로 만든 1인 자기소개(퍼스널 브랜드) 정적 사이트입니다. GitHub Pages로 배포됩니다.

## 구성

- `index.html` — 페이지 구조
- `styles.css` — 디자인(잉크 네이비 다크 테마)
- `script.js` — 스크롤 리빌, 수치 카운트업, 커리어 타임라인, 모바일 메뉴
- `assets/` — 이미지

## 로컬 미리보기

```bash
python -m http.server 5500
```

브라우저에서 http://localhost:5500 접속.

## 배포

`main` 브랜치 루트를 GitHub Pages 소스로 사용합니다. 수정 후 커밋·푸시하면 자동 갱신됩니다.

```bash
git add .
git commit -m "update"
git push
```
