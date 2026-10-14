import type { Lang } from './languages';

/** The words of the site's own chrome: navigation, footer, empty states. The copy of the pages is in `content/`. */
export interface Strings {
  language: string;
  menu: string;
  skip: string;
  home: string;
  nav: {
    search: string;
    viz: string;
    learn: string;
    tipitaka: string;
    about: string;
    support: string;
    blog: string;
  };
  /** The text of the link that ends each home section. */
  sectionLink: Record<'teaching' | 'search' | 'viz' | 'learn', string>;
  legal: string;
  footerServices: string;
  blogTitle: string;
  blogDescription: string;
  blogEmpty: string;
  notFoundTitle: string;
  notFoundText: string;
}

/** The language switcher shows each language under its own name. */
export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: 'English',
  fr: 'Français',
  vi: 'Tiếng Việt',
};

export const STRINGS: Record<Lang, Strings> = {
  en: {
    language: 'Language',
    menu: 'Menu',
    skip: 'Skip to the content',
    home: 'PaliCanon, home',
    nav: {
      search: 'Search',
      viz: 'Map',
      learn: 'Learn Pāli',
      tipitaka: 'Tipiṭaka app',
      about: 'About',
      support: 'Support',
      blog: 'Blog',
    },
    sectionLink: {
      teaching: 'About the project',
      search: 'Open the search',
      viz: 'Open the map',
      learn: 'Start learning Pāli',
    },
    legal: 'Legal notice',
    footerServices: 'The PaliCanon services',
    blogTitle: 'Blog',
    blogDescription: 'News and guides from PaliCanon.',
    blogEmpty: 'No post yet.',
    notFoundTitle: 'Page not found',
    notFoundText: 'This page does not exist. Go back to the home page.',
  },
  fr: {
    language: 'Langue',
    menu: 'Menu',
    skip: 'Aller au contenu',
    home: 'PaliCanon, accueil',
    nav: {
      search: 'Recherche',
      viz: 'Carte',
      learn: 'Apprendre le pāli',
      tipitaka: 'Appli Tipiṭaka',
      about: 'À propos',
      support: 'Soutenir',
      blog: 'Blog',
    },
    sectionLink: {
      teaching: 'À propos du projet',
      search: 'Ouvrir la recherche',
      viz: 'Ouvrir la carte',
      learn: 'Commencer à apprendre le pāli',
    },
    legal: 'Mentions légales',
    footerServices: 'Les services PaliCanon',
    blogTitle: 'Blog',
    blogDescription: 'Les nouvelles et les guides de PaliCanon.',
    blogEmpty: 'Aucun article pour le moment.',
    notFoundTitle: 'Page introuvable',
    notFoundText: "Cette page n'existe pas. Retournez à l'accueil.",
  },
  vi: {
    language: 'Ngôn ngữ',
    menu: 'Menu',
    skip: 'Chuyển đến nội dung',
    home: 'PaliCanon, trang chủ',
    nav: {
      search: 'Tìm kiếm',
      viz: 'Bản đồ',
      learn: 'Học Pāli',
      tipitaka: 'Ứng dụng Tipiṭaka',
      about: 'Giới thiệu',
      support: 'Ủng hộ',
      blog: 'Blog',
    },
    sectionLink: {
      teaching: 'Về dự án',
      search: 'Mở trang tìm kiếm',
      viz: 'Mở bản đồ',
      learn: 'Bắt đầu học Pāli',
    },
    legal: 'Thông tin pháp lý',
    footerServices: 'Các dịch vụ của PaliCanon',
    blogTitle: 'Blog',
    blogDescription: 'Tin tức và hướng dẫn từ PaliCanon.',
    blogEmpty: 'Chưa có bài viết nào.',
    notFoundTitle: 'Không tìm thấy trang',
    notFoundText: 'Trang này không tồn tại. Hãy quay về trang chủ.',
  },
};

/** The services the footer links to: their own sites. */
export const SERVICE_LINKS = {
  search: 'https://search.palicanon.app',
  viz: 'https://viz.palicanon.app',
  learn: 'https://learn.palicanon.app',
  tipitaka: 'https://apps.apple.com/app/id6760995639',
} as const;
