import type { ImageMetadata } from 'astro';
import searchDark from '../assets/screens/search/dark.jpg';
import searchFrench from '../assets/screens/search/french.jpg';
import searchHome from '../assets/screens/search/home.jpg';
import searchResults from '../assets/screens/search/results.jpg';
import searchWords from '../assets/screens/search/words.jpg';
import appGraph from '../assets/screens/tipitaka/concept-graph.jpg';
import appMain from '../assets/screens/tipitaka/main.jpg';
import appNotes from '../assets/screens/tipitaka/notes.jpg';
import appReader from '../assets/screens/tipitaka/reader.jpg';
import appSearch from '../assets/screens/tipitaka/search.jpg';
import vizCluster from '../assets/screens/viz/cluster.jpg';
import vizMeaning from '../assets/screens/viz/meaning.jpg';
import vizParallels from '../assets/screens/viz/parallels.jpg';
import vizPhone from '../assets/screens/viz/phone.jpg';
import type { Lang } from '../lib/languages';

/**
 * The screenshots of the services that have them, in the order of their
 * captions, and the slider's own words. Team-owned data, not the author's
 * copy: the images and the captions come from search-front's Support page
 * (`app/public/support/`, `app/src/pages/content_{en,fr,vi}.rs`, the
 * SearchBlock and AppBlock alts), copied at search-front 6d370b4. The map's
 * (user check 11) were captured from the map run locally, 2026-10-16, and
 * scaled to 554 x 1200 like the others.
 */
export type ScreensProject = 'search' | 'tipitaka' | 'viz';

export const SCREENS: Record<ScreensProject, ImageMetadata[]> = {
  search: [searchHome, searchResults, searchWords, searchFrench, searchDark],
  tipitaka: [appMain, appReader, appSearch, appGraph, appNotes],
  viz: [vizParallels, vizMeaning, vizCluster, vizPhone],
};

export const CAPTIONS: Record<ScreensProject, Record<Lang, string[]>> = {
  search: {
    en: [
      "The search's home",
      'Results for a question',
      'Results by exact words',
      'A search in French',
      'The dark theme',
    ],
    fr: [
      'L’accueil de la recherche',
      'Résultats pour une question',
      'Résultats par mots exacts',
      'Une recherche en français',
      'Le thème sombre',
    ],
    vi: [
      'Trang chủ của công cụ tìm kiếm',
      'Kết quả cho một câu hỏi',
      'Kết quả theo từ chính xác',
      'Một lượt tìm bằng tiếng Pháp',
      'Giao diện tối',
    ],
  },
  tipitaka: {
    en: [
      'Home screen of the Tipiṭaka app',
      'Reading a sutta, Pāli and translation side by side',
      'Searching the Canon by word or by meaning',
      'Concept graph linking related passages',
      'Taking notes on a passage',
    ],
    fr: [
      'Écran d’accueil de l’application Tipiṭaka',
      'Lecture d’un sutta, pali et traduction côte à côte',
      'Recherche dans le Canon par mot ou par sens',
      'Graphe de concepts reliant les passages proches',
      'Prise de notes sur un passage',
    ],
    vi: [
      'Màn hình chính của ứng dụng Tipiṭaka',
      'Đọc một bài kinh, Pāli và bản dịch song song',
      'Tìm kiếm trong Tam Tạng theo từ hoặc theo ý nghĩa',
      'Sơ đồ khái niệm liên kết các đoạn kinh liên quan',
      'Ghi chú trên một đoạn kinh',
    ],
  },
  viz: {
    en: [
      'The parallels view, after SuttaCentral',
      'The meaning view, by embeddings',
      'A sutta and its closest neighbours',
      'The collections and the similarity threshold',
    ],
    fr: [
      'La vue des parallèles, d’après SuttaCentral',
      'La vue par le sens, par embeddings',
      'Un sutta et ses plus proches voisins',
      'Les collections et le seuil de similarité',
    ],
    vi: [
      'Cách nhìn theo kinh tương đương, theo SuttaCentral',
      'Cách nhìn theo ý nghĩa, bằng embeddings',
      'Một bài kinh và những bài gần nhất',
      'Các bộ kinh và ngưỡng tương đồng',
    ],
  },
};

/** The slider's words: the name of its region, its two buttons. */
export const SLIDER_WORDS: Record<Lang, { region: string; previous: string; next: string }> = {
  en: { region: 'Screenshots', previous: 'Previous screenshot', next: 'Next screenshot' },
  fr: { region: "Captures d'écran", previous: 'Capture précédente', next: 'Capture suivante' },
  vi: { region: 'Ảnh chụp màn hình', previous: 'Ảnh trước', next: 'Ảnh tiếp theo' },
};
