// Display copy only. Protect identifiers and URLs; never apply this to source evidence or raw HTML.
function shiftDecimal(value: string, places: number): string {
  const sign = value.startsWith('-') ? '-' : value.startsWith('+') ? '+' : '';
  const [whole, fraction = ''] = value.replace(/^[+-]/, '').replace(/,/g, '').split('.');
  const digits = whole + fraction;
  const point = whole.length + places;
  const shifted = point <= 0 ? `0.${'0'.repeat(-point)}${digits}`
    : point >= digits.length ? digits + '0'.repeat(point - digits.length)
      : `${digits.slice(0, point)}.${digits.slice(point)}`;
  const [integer, decimal = ''] = shifted.split('.');
  const normalized = integer.replace(/^0+(?=\d)/, '') + (decimal.replace(/0+$/, '') ? `.${decimal.replace(/0+$/, '')}` : '');
  return (normalized === '0' ? '' : sign) + normalized;
}

function formatTonnage(text: string): string {
  const number = '[+-]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
  const quantity = new RegExp(`(?<![\\w.,+-])(${number})(?:\\s*([～~至—–]|--?)\\s*(${number}))?\\s*千吨`, 'g');
  return text.replace(quantity, (_match, first: string, separator: string | undefined, last: string | undefined) => {
    const large = [first, last].some(value => value !== undefined && BigInt(value.replace(/^[+-]/, '').replace(/,/g, '').split('.')[0]) >= 10n);
    const places = large ? -1 : 3;
    return `${shiftDecimal(first, places)}${last ? `${separator}${shiftDecimal(last, places)}` : ''} ${large ? '万吨' : '吨'}`;
  });
}

export function formatChineseCopy(text: string): string {
  return text.split(/(https?:\/\/[^\s<>\u3400-\u9fff“”‘’，。！？：；、]+|`[^`]*`|[A-Za-z0-9_.\/-]+\.(?:ts|tsx|js|py|json|md|csv|xlsx|pdf|env)\b)/g).map((part, i) => {
    if (i % 2) return part;
    return formatTonnage(part)
      .replace(/[—–]+/g, '--')
      .replace(/"([^"\n]*[\p{Script=Han}][^"\n]*)"/gu, '“$1”')
      .replace(/'([^'\n]*[\p{Script=Han}][^'\n]*)'/gu, '‘$1’')
      .replace(/([\p{Script=Han}])\s*([,!?;:.])/gu, (_m, c, p) => c + ({',':'，','!':'！','?':'？',';':'；',':':'：','.':'。'} as Record<string,string>)[p])
      .replace(/([,!?;:])\s*(?=[\p{Script=Han}])/gu, p => ({',':'，','!':'！','?':'？',';':'；',':':'：'} as Record<string,string>)[p.trim()]!)
      .replace(/([\p{Script=Han}])([A-Za-z0-9])/gu, '$1 $2')
      .replace(/([A-Za-z0-9])([\p{Script=Han}])/gu, '$1 $2')
      .replace(/\s*([，。！？：；、])\s*/g, '$1');
  }).join('');
}
