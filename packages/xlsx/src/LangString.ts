export class LangString {
  readonly language: string;
  readonly value: string;

  constructor({ language, value }: { language: string; value: string }) {
    this.language = language;
    this.value = value;
  }
}
