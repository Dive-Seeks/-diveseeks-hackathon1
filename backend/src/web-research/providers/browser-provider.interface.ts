export interface IBrowserProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  search(query: string): Promise<string[]>;
  scrape(url: string): Promise<string>;
}
