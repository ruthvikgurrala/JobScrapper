export interface Job {
  id?: string;
  companyName: string;
  title: string;
  url: string;
  firstSeen: number;
  rolesMatched: string[];
  location?: string;
  yoe?: number | string;
  skills?: string[];
  jd?: string;
}
