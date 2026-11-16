import { Share } from 'react-native';

/** Phones: hands the text to the share sheet (save to Files, e-mail it to yourself). */
export async function saveTextFile(name: string, text: string): Promise<boolean> {
  try {
    await Share.share({ title: name, message: text });
    return true;
  } catch {
    return false;
  }
}
