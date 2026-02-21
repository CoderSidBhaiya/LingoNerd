/**
 * Google Apps Script Web App endpoint.
 * Accepts JSON { text, targetLang, instruction } and returns { translatedText }.
 */
function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(body);

    const text = String(payload.text || '').trim();
    const targetLang = String(payload.targetLang || 'en').trim();
    const instruction = String(payload.instruction || '').trim();

    const sourceText = instruction ? instruction + '\n\n' + text : text;
    const translatedText = text
      ? LanguageApp.translate(sourceText, '', targetLang)
      : '';

    return ContentService.createTextOutput(
      JSON.stringify({ translatedText: translatedText })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ translatedText: '', error: String(error) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
