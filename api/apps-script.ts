export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

function normalizeAndValidateAppsScriptUrl(rawUrl: string): { validUrl?: string; error?: string } {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { error: 'ยังไม่ได้ระบุ Google Apps Script Web App URL' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { error: 'รูปแบบ URL ของ Google Apps Script ไม่ถูกต้อง' };
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
    return { error: 'อนุญาตเฉพาะลิงก์ https://script.google.com/... เท่านั้น' };
  }

  // Strip optional multi-account segment (/macros/u/1/s/... -> /macros/s/...)
  const normalizedPath = parsed.pathname.replace(/^\/macros\/u\/\d+\//, '/macros/');
  if (normalizedPath.endsWith('/dev')) {
    return {
      error:
        'ลิงก์นี้เป็นลิงก์ทดสอบ (/dev) ซึ่งต้องล็อกอิน Google — กรุณาใช้ลิงก์ Web App ที่ลงท้าย /exec จากเมนู Deploy > Manage deployments',
    };
  }

  if (!/^\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(normalizedPath)) {
    return {
      error: 'URL ต้องเป็นลิงก์ Web App ที่ลงท้ายด้วย /exec (เช่น https://script.google.com/macros/s/.../exec)',
    };
  }

  return { validUrl: `https://script.google.com${normalizedPath}` };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { validUrl, error } = normalizeAndValidateAppsScriptUrl(body.url);
    if (!validUrl) {
      return res.status(400).json({ ok: false, error });
    }

    const upstreamRes = await fetch(validUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(body.payload || {}),
      redirect: 'follow',
    });

    const rawText = await upstreamRes.text();
    const trimmedText = rawText.trim();

    if (
      trimmedText.startsWith('<!DOCTYPE') ||
      trimmedText.startsWith('<html') ||
      trimmedText.includes('accounts.google.com') ||
      trimmedText.includes('ServiceLogin') ||
      upstreamRes.url.includes('accounts.google.com')
    ) {
      return res.status(403).json({
        ok: false,
        needsPublicDeploy: true,
        error:
          'Apps Script ยังไม่ได้เปิดสิทธิ์แบบสาธารณะ — กรุณาไปที่ Apps Script > Deploy > Manage deployments แล้วตั้งค่า Execute as: Me และ Who has access: ทุกคน (Anyone)',
      });
    }

    try {
      const json = JSON.parse(trimmedText);
      return res.status(upstreamRes.ok ? 200 : upstreamRes.status).json(json);
    } catch {
      return res.status(502).json({
        ok: false,
        error: `Apps Script ตอบกลับไม่ใช่ JSON (${upstreamRes.status}) — กรุณาตรวจสอบว่าได้กด Deploy เป็น Web App เวอร์ชันล่าสุดแล้ว`,
      });
    }
  } catch (err: any) {
    return res.status(502).json({
      ok: false,
      error: err?.message || 'ไม่สามารถเชื่อมต่อไปยัง Google Apps Script ได้ในขณะนี้',
    });
  }
}
