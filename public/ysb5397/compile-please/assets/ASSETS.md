# 도장 에셋 v1

추가 적용: `bureau-day-v1.png`는 `drafts/bureau-day-v1.png`를 보존한 채 복사한 창구 배경이다. 인물 초안 이미지는 분리·변형하지 않았다. 실제 랜덤 방문자는 `../visitors.js`의 공통 픽셀 격자 레이어로 렌더링한다.

내장 image_gen으로 승인된 초안을 참고해 생성한 투명 PNG. 기존 초안은 drafts/에 보존했다.

- stamp-approve-v1.png: 승인 인장. 심사관의 승인 처분 표시.
- stamp-reject-v1.png: 반려 인장. 심사관의 반려 처분 표시.
- stamp-tool-v1.png: 승인·반려 버튼이 공유하는 나무 도구. 이름표는 실제 HTML로 표시한다. 눌림은 CSS로 처리한다.

고정 크기 저해상도 스프라이트 시트가 아닌 개별 생성 이미지이며 화면에서는 제한된 표시 크기로 축소한다. PNG 투명 채널을 확인했고, 종이 배경과 합성한 결과를 브라우저에서 확인했다. 이미지가 로드되지 않으면 HTML 글자 도장과 버튼 이름을 유지한다. 초안의 배경이 포함된 이미지는 게임에서 사용하지 않는다.

## 생성 프롬프트

참고 이미지: assets/drafts/stamp-kit-concept-v1.png

### approve

Extract/recreate ONLY the TOP LEFT approval ink impression from the reference as ONE standalone game asset. Exactly Korean text "승인", large bold correct Korean letters, dark opaque forest teal ink #164d43 double rectangular outline. NO cream paper or fill: all empty space inside outline, between letter strokes and outside outline must be true transparent alpha. Ink marks must be opaque and readable, NOT faint translucent. Crisp chunky pixel-art hard edges, subtle dry ink gaps only on border, no blur, glow, gradient, shadow, lighting or background. Center broad horizontal stamp in a tightly fitted landscape image with small transparent margins. No other objects. Preserve the approved original style.

### reject

Extract/recreate ONLY the TOP RIGHT rejection ink impression from the reference as ONE standalone game asset. Exactly Korean text "반려", large bold correct Korean letters, dark opaque brick red ink #8b2424 and rectangular outline with four diagonally cut corners. NO cream paper or fill: all empty space inside outline, between letter strokes and outside outline must be true transparent alpha. Ink marks must be opaque and readable, NOT faint translucent. Crisp chunky pixel-art hard edges, subtle dry ink gaps only on border, no blur, glow, gradient, shadow, lighting or background. Center broad horizontal stamp in a tightly fitted landscape image with small transparent margins. No other objects. Preserve the approved original style.

### tool

Recreate ONLY ONE standing wooden rubber stamp TOOL from the middle row of the reference, as a standalone pixel-art game object. Preserve its walnut wood rounded handle, olive-charcoal metal base and restrained cream highlights, frontal view, thick dark stepped pixel edges. Change the identification plaque to a plain blank dark olive plaque with NO letters and NO symbols, and make the rubber pad dark neutral charcoal; this one reusable tool will have live HTML approval/rejection labels. Entire isolated object visible centered on true transparent alpha background. No paper, shadows, haze, glow, gradients, floor or other objects. Compact hard-edged chunky pixel art. Wood and metal are fully opaque, transparent outside silhouette. Match the reference tool proportions and style.

