export type Locale = "mn" | "ko";

type Messages = Record<string, { mn: string; ko: string }>;

export const messages: Messages = {
  "nav.home": { mn: "Нүүр", ko: "홈" },
  "nav.news": { mn: "Мэдээ", ko: "뉴스" },
  "nav.events": { mn: "Үйл явдал", ko: "이벤트" },
  "nav.profile": { mn: "Профайл", ko: "프로필" },
  "menu.news": { mn: "Мэдээ мэдээлэл", ko: "공지/뉴스" },
  "menu.activities": { mn: "Үйл ажиллагаа", ko: "활동" },
  "menu.training": { mn: "Сургалт, семинар", ko: "교육/세미나" },
  "menu.membership": { mn: "Гишүүнчлэл", ko: "회원가입" },
  "menu.advice": { mn: "Зөвлөгөө, дэмжлэг", ko: "상담/지원" },
  "menu.about": { mn: "Бидний тухай", ko: "단체 소개" },
};

export function t(key: keyof typeof messages, locale: Locale = "mn"): string {
  return messages[key]?.[locale] ?? key;
}
