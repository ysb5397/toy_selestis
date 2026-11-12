export const fields = [
  { key: 'gender', label: '성별', icon: '♡', values: ['남성', '여성'] },
  { key: 'age', label: '나이', icon: '🎂', values: Array.from({ length: 33 }, (_, i) => `${i + 20}세`) },
  { key: 'height', label: '키', icon: '↕', values: Array.from({ length: 46 }, (_, i) => `${i + 150} cm`) },
  { key: 'weight', label: '체중', icon: '⚖', values: Array.from({ length: 66 }, (_, i) => `${i + 45} kg`) },
  { key: 'job', label: '직업', icon: '💼', values: ['개발자', '의사', '디자이너', '대학생', '카페 사장', '요리사', '뮤지션', '운동선수', '작가', '수의사', '소방관', '교사', '프리랜서', '배우', '회사원', '파일럿', '건축가', '구직 중'] },
  { key: 'country', label: '국적', icon: '🌏', values: ['🇰🇷 대한민국', '🇯🇵 일본', '🇺🇸 미국', '🇨🇦 캐나다', '🇫🇷 프랑스', '🇮🇹 이탈리아', '🇬🇧 영국', '🇦🇺 호주', '🇧🇷 브라질', '🇩🇪 독일', '🇪🇸 스페인', '🇹🇭 태국'] },
  { key: 'married', label: '기혼 여부', icon: '💍', values: ['미혼', '기혼'] },
  { key: 'mbti', label: 'MBTI', icon: '✧', values: ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'] },
  { key: 'personality', label: '성격', icon: '☀', values: ['다정한 공감왕', '엉뚱한 매력쟁이', '차분한 낭만파', '장난꾸러기', '솔직한 직진파', '수줍은 츤데레', '든든한 긍정왕', '열정적인 모험가'] },
  { key: 'hobby', label: '취미', icon: '🎧', values: ['주말 캠핑', '게임', '카페 탐방', '독서', '요리', '운동', '여행', '영화 감상', '사진 찍기', '산책', '밴드 활동', '방탈출'] },
  { key: 'style', label: '연애 스타일', icon: '💌', values: ['매일 보고 싶어', '연락은 칼답', '표현은 아낌없이', '친구 같은 연애', '천천히 깊게', '서프라이즈 장인', '함께 성장하기', '취미 공유 필수'] },
  { key: 'date', label: '첫 데이트', icon: '☕', values: ['한강 피크닉', '놀이공원', '동네 맛집 탐방', '전시회 데이트', '바다 드라이브', '야경 산책', '보드게임 카페', '영화관', '쿠킹 클래스', '서점 데이트'] },
];
export function generateProfile(gender = 'all', random = Math.random) {
  return Object.fromEntries(fields.map(field => [field.key,
    field.key === 'gender' && gender !== 'all' ? (gender === 'male' ? '남성' : '여성')
      : field.values[Math.floor(random() * field.values.length)],
  ]));
}
export function validProfile(profile) {
  return !!profile && fields.every(field => field.values.includes(profile[field.key]));
}
export function profileText(profile) {
  return `♡ love-maker · 오늘의 랜덤 애인\n\n${fields.map(field => `${field.label}: ${profile[field.key]}`).join('\n')}\n\n재미로 즐기는 가상의 프로필이에요.`;
}
