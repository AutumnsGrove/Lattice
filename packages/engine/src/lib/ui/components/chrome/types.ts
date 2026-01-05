export interface NavItem {
  href: string;
  label: string;
  icon?: Component;
  external?: boolean;
}

export interface FooterLink {
  href: string;
  label: string;
  icon?: Component;
  external?: boolean;
}

export type MaxWidth = "narrow" | "default" | "wide";
