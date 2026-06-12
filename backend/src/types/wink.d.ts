declare module 'wink-nlp' {
  const winkNlp: any;
  export const its: any;
  export const as: any;
  export default winkNlp;
}
declare module 'wink-eng-lite-web-model' {
  const model: any;
  export default model;
}
declare module 'wink-nlp/src/its.js' {
  const its: any;
  export = its;
}
declare module 'wink-porter2-stemmer' {
  function stem(word: string): string;
  export = stem;
}
