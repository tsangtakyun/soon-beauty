import type { Product, Profile } from '@/types/database';

export type MakeupShareTemplate = {
  id: 'soft-cover' | 'editorial-note' | 'product-sheet';
  name: string;
  tagline: string;
  description: string;
  orientation: 'portrait' | 'square';
  tone: string;
  composition: string[];
  stylingKeywords: string[];
};

export type MakeupSharePromptInput = {
  templateId: MakeupShareTemplate['id'];
  title: string | null;
  notes: string | null;
  selfieUrl: string | null;
  selectedProducts: Array<Pick<Product, 'name' | 'brand'>>;
};

export const MAKEUP_SHARE_TEMPLATES: MakeupShareTemplate[] = [
  {
    id: 'soft-cover',
    name: '柔光封面',
    tagline: '像一本溫柔美容雜誌的封面',
    description: '以自拍為主角，配合柔光留白與細緻標題，適合分享日常妝容。',
    orientation: 'portrait',
    tone: '奶油紙感、柔和自然、帶少量編輯式留白',
    composition: ['自拍作為主視覺', '產品名稱作為封面副標', '保留柔和紙本感背景'],
    stylingKeywords: ['editorial beauty cover', 'soft daylight', 'cream paper texture', 'delicate typography'],
  },
  {
    id: 'editorial-note',
    name: '編輯手記',
    tagline: '像雜誌內頁的妝容記事',
    description: '同時呈現自拍、妝容重點與產品清單，更適合分享完整故事。',
    orientation: 'portrait',
    tone: '內頁排版感、溫暖留白、文字層次分明',
    composition: ['自拍與產品清單並置', '保留標題與短文案區', '突出妝容氣氛而非商業硬銷'],
    stylingKeywords: ['beauty editorial spread', 'warm neutral palette', 'magazine layout', 'product callouts'],
  },
  {
    id: 'product-sheet',
    name: '產品清單',
    tagline: '像美容編輯整理的今日搭配頁',
    description: '以產品名單與搭配順序為主，適合強調今天用過哪些產品。',
    orientation: 'square',
    tone: '清爽排版、產品卡片感、方便社交分享',
    composition: ['產品名稱列表為主', '自拍作為輔助圖', '保留今日妝容標題與重點摘要'],
    stylingKeywords: ['product board', 'beauty checklist', 'clean editorial card', 'social share layout'],
  },
];

export function getMakeupShareTemplate(templateId: MakeupShareTemplate['id']) {
  return (
    MAKEUP_SHARE_TEMPLATES.find((template) => template.id === templateId) ??
    MAKEUP_SHARE_TEMPLATES[0]
  );
}

export function canUsePremiumShare(profile: Pick<Profile, 'tier'> | null) {
  return profile?.tier === 'pro' || profile?.tier === 'pro_plus';
}

export function buildMakeupSharePrompt(input: MakeupSharePromptInput) {
  const template = getMakeupShareTemplate(input.templateId);
  const productList = input.selectedProducts.length
    ? input.selectedProducts
        .map((product, index) => `${index + 1}. ${product.brand ? `${product.brand} ` : ''}${product.name}`)
        .join('\n')
    : '未提供產品資料';

  const title = input.title?.trim() || '今日妝容';
  const notes = input.notes?.trim() || '未有額外備註';

  const prompt = [
    '請根據以下資料生成一張美容雜誌風分享圖。',
    `模板方向：${template.name}。`,
    `整體氣氛：${template.tone}。`,
    `構圖重點：${template.composition.join('、')}。`,
    `視覺關鍵字：${template.stylingKeywords.join(', ')}。`,
    `圖片比例：${template.orientation === 'portrait' ? '直向 4:5' : '正方形 1:1'}。`,
    `標題：${title}。`,
    `文字摘要：${notes}。`,
    `本次使用產品：\n${productList}`,
    input.selfieUrl
      ? '請保留自拍中的人物特徵與妝容方向，整體做成精緻、自然、可分享的編輯式視覺。'
      : '未提供自拍，請用柔和美容編輯排版呈現產品與妝容主題。',
    '避免過度塑膠感、過度修圖、俗艷濾鏡、雜亂背景與過多裝飾文字。',
  ].join('\n');

  return {
    template,
    prompt,
    summary: {
      title,
      notes,
      productCount: input.selectedProducts.length,
      orientation: template.orientation,
    },
  };
}

export function getMakeupShareOutputSize(templateId: MakeupShareTemplate['id']) {
  const template = getMakeupShareTemplate(templateId);
  return template.orientation === 'portrait' ? '1024x1536' : '1024x1024';
}
