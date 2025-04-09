/// <reference types="react" />
/// <reference types="react-dom" />

declare namespace JSX {
  interface IntrinsicElements {
    div: any;
    span: any;
    p: any;
    h1: any;
    h2: any;
    h3: any;
    button: any;
    a: any;
    img: any;
    input: any;
    textarea: any;
    select: any;
    option: any;
    form: any;
    label: any;
    header: any;
    main: any;
    footer: any;
    nav: any;
    section: any;
    article: any;
    aside: any;
    ul: any;
    ol: any;
    li: any;
    table: any;
    tr: any;
    td: any;
    th: any;
    thead: any;
    tbody: any;
    tfoot: any;
    svg: any;
    path: any;
    circle: any;
    rect: any;
  }
}

// Deno namespace for Supabase Edge Functions
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };
}

// Fix profile type issues
interface Json {
  [key: string]: any;
}

interface Profile {
  id: string;
  avatar_url?: string;
  created_at?: string;
  display_name?: string;
  email?: string;
  subscription_tier?: string;
  total_predictions?: number;
  winning_predictions?: number;
  total_profit?: number;
  // Optional fields to avoid type errors
  data_visualization_preferences?: Json;
  full_name?: string;
  notification_preferences?: Json;
  subscription_id?: string;
  subscription_plan?: string;
  subscription_status?: string;
  theme_preference?: string;
  username?: string;
}
