import { describe, expect, it } from 'vitest';
import { suggestEmail } from './emailTypos';

describe('e-mail typo check', () => {
  it('catches slips in common e-mail domains', () => {
    expect(suggestEmail('ada@gmail.clm')).toBe('ada@gmail.com');
    expect(suggestEmail('ada@gmial.com')).toBe('ada@gmail.com');
    expect(suggestEmail('ada@gmail.co')).toBe('ada@gmail.com');
    expect(suggestEmail('ada@gmail')).toBe('ada@gmail.com');
    expect(suggestEmail('ada@hotmial.se')).toBe('ada@hotmail.se');
    expect(suggestEmail('Ada@Icloud.con')).toBe('ada@icloud.com');
    expect(suggestEmail('ada@outlok.com')).toBe('ada@outlook.com');
  });

  it('leaves correct and unfamiliar addresses alone', () => {
    expect(suggestEmail('ada@gmail.com')).toBeNull();
    expect(suggestEmail('ada@hotmail.se')).toBeNull();
    expect(suggestEmail('info@nordvra.se')).toBeNull();
    expect(suggestEmail('ada@yigaoluganda.com')).toBeNull();
    expect(suggestEmail('ada@uni.ac.ug')).toBeNull();
  });

  it('ignores input that is not an address yet', () => {
    expect(suggestEmail('')).toBeNull();
    expect(suggestEmail('ada')).toBeNull();
    expect(suggestEmail('ada@')).toBeNull();
  });
});
