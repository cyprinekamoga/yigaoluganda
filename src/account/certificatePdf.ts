import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Phones: turns the certificate page into a PDF and opens the share sheet (save to Files,
 * send by e-mail, print). The web version is in certificatePdf.web.ts.
 */
export async function saveCertificatePdf(html: string, fileTitle: string): Promise<boolean> {
  try {
    // A4 landscape at 72 points per inch.
    const { uri } = await Print.printToFileAsync({ html, width: 842, height: 595 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: fileTitle, UTI: 'com.adobe.pdf' });
    }
    return true;
  } catch {
    return false;
  }
}
