import type { HomeSection, Lang } from './languages';

/** The words of the site's own chrome: navigation, footer, empty states. The copy of the pages is in `content/`. */
export interface Strings {
  language: string;
  skip: string;
  home: string;
  /** The bar's back link on every page but the home, to the language's home (user check 14). */
  back: string;
  nav: {
    search: string;
    viz: string;
    learn: string;
    tipitaka: string;
    about: string;
    support: string;
    blog: string;
  };
  /** Ends a home scene's link name: "<title>, read more". */
  readMore: string;
  /** The gold button under a home scene's text, to the scene's page (user check 9). */
  sceneButton: Record<HomeSection, string>;
  legal: string;
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
    skip: 'Skip to the content',
    home: 'PaliCanon, home',
    back: 'Back to the home',
    nav: {
      search: 'Search',
      viz: 'Map',
      learn: 'Learn Pāli',
      tipitaka: 'Tipiṭaka app',
      about: 'About',
      support: 'Support',
      blog: 'Blog',
    },
    readMore: 'read more',
    sceneButton: {
      teaching: 'Discover the app',
      search: 'Discover the search',
      viz: 'Discover the map',
      learn: 'Discover Learn Pāli',
    },
    legal: 'Legal notice',
    blogTitle: 'Blog',
    blogDescription: 'News and guides from PaliCanon.',
    blogEmpty: 'No post yet.',
    notFoundTitle: 'Page not found',
    notFoundText: 'This page does not exist. Go back to the home page.',
  },
  fr: {
    language: 'Langue',
    skip: 'Aller au contenu',
    home: 'PaliCanon, accueil',
    back: "Retour à l'accueil",
    nav: {
      search: 'Recherche',
      viz: 'Carte',
      learn: 'Apprendre le pāli',
      tipitaka: 'Appli Tipiṭaka',
      about: 'À propos',
      support: 'Soutenir',
      blog: 'Blog',
    },
    readMore: 'en savoir plus',
    sceneButton: {
      teaching: "Découvrir l'app",
      search: 'Découvrir la recherche',
      viz: 'Découvrir la carte',
      learn: 'Découvrir Apprendre le pāli',
    },
    legal: 'Mentions légales',
    blogTitle: 'Blog',
    blogDescription: 'Les nouvelles et les guides de PaliCanon.',
    blogEmpty: 'Aucun article pour le moment.',
    notFoundTitle: 'Page introuvable',
    notFoundText: "Cette page n'existe pas. Retournez à l'accueil.",
  },
  vi: {
    language: 'Ngôn ngữ',
    skip: 'Chuyển đến nội dung',
    home: 'PaliCanon, trang chủ',
    back: 'Về trang chủ',
    nav: {
      search: 'Tìm kiếm',
      viz: 'Bản đồ',
      learn: 'Học Pāli',
      tipitaka: 'Ứng dụng Tipiṭaka',
      about: 'Giới thiệu',
      support: 'Ủng hộ',
      blog: 'Blog',
    },
    readMore: 'xem thêm',
    sceneButton: {
      teaching: 'Khám phá ứng dụng',
      search: 'Khám phá tìm kiếm',
      viz: 'Khám phá bản đồ',
      learn: 'Khám phá Học Pāli',
    },
    legal: 'Thông tin pháp lý',
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
  viz: 'https://map.palicanon.app',
  learn: 'https://learn.palicanon.app',
  tipitaka: 'https://apps.apple.com/app/id6760995639',
} as const;
