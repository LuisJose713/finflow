import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const widths = [320,375,430,768,1280];
const mockPolicy = {
  version:'2026-11-07-v1',ready:true,controllerName:'FinFlow QA',
  contactEmail:'qa@example.com',contactAddress:'Calle de prueba',
  contactPhone:'3000000000',effectiveDate:'2026-11-07'
};
const mockCatalog = {currency:'COP',checkoutEnabled:false,offers:[
  {code:'FREE',title:'FinFlow Free',description:'Gratis',originalCop:0,priceCop:0,promoCode:null,promoTitle:null,savingsPercent:0,checkoutEnabled:false},
  {code:'MONTHLY',title:'FinFlow Pro mensual',description:'Pro mensual',originalCop:9900,priceCop:9900,promoCode:null,promoTitle:null,savingsPercent:0,checkoutEnabled:false},
  {code:'YEARLY',title:'FinFlow Pro anual',description:'Pro anual',originalCop:79900,priceCop:79900,promoCode:null,promoTitle:null,savingsPercent:0,checkoutEnabled:false},
  {code:'LIFETIME',title:'FinFlow Pro de por vida',description:'Pro de por vida',originalCop:189900,priceCop:189900,promoCode:null,promoTitle:null,savingsPercent:0,checkoutEnabled:false}
]};
mkdirSync('screenshots',{recursive:true});

async function mockApi(page:any) {
  await page.route('http://localhost:8081/**', async (route:any) => {
    const path = new URL(route.request().url()).pathname;
    const payload = path === '/privacy/policy' ? mockPolicy
      : path === '/billing/catalog' ? mockCatalog
      : path === '/privacy/status' ? {accepted:false,version:mockPolicy.version,policyReady:true}
      : path === '/auth/me' ? {id:99,name:'Usuario QA',email:'qa@example.com',role:'USER'}
      : {error:'QA mocked endpoint'};
    await route.fulfill({
      status: 200,
      headers: {
        'access-control-allow-origin':'*',
        'access-control-allow-methods':'GET,POST,OPTIONS',
        'access-control-allow-headers':'Authorization,Content-Type',
        'content-type':'application/json'
      },
      body:JSON.stringify(payload)
    });
  });
}

for (const width of widths) {
  test(`login, registro, precios y consentimiento: ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:780});
    await mockApi(page);
    for (const pathname of ['/login','/register','/pricing']) {
      await page.goto(pathname,{waitUntil:'domcontentloaded'});
      await expect(page.locator('body')).toBeVisible();
      await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBeTruthy();
      await page.screenshot({path:`screenshots/${pathname.slice(1)}-${width}.png`,fullPage:true});
    }
    await page.addInitScript(() => {
      const tokenPayload = btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}));
      localStorage.setItem('token','test.'+tokenPayload+'.test');
      localStorage.setItem('user',JSON.stringify({id:99,name:'Usuario QA',email:'qa@example.com',role:'USER'}));
    });
    await page.goto('/security',{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('dialog',{name:/Actualizamos nuestra política de privacidad/})).toBeVisible();
    await expect(page.getByRole('button',{name:'Aceptar y continuar'})).toBeDisabled();
    await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBeTruthy();
    await page.screenshot({path:`screenshots/consent-${width}.png`,fullPage:true});
  });
}

/* Layout contract: all supported field groups stack at tablet width and below.
 * Exercise actual global CSS rather than inspecting the SCSS source alone.
 */
for (const width of [320,375,430,768,820,1024]) {
  test(`field groups are single-column on compact screens: ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:780});
    await mockApi(page);
    await page.goto('/pricing',{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('heading',{name:/Tu tranquilidad financiera/})).toBeVisible();

    const result = await page.evaluate(() => {
      const shell=document.createElement('div');
      shell.className='app-shell';
      const form=document.createElement('form');
      const groups=['form-grid','field-row','form-pair','form-columns'];
      for (const klass of groups) {
        const group=document.createElement('div');
        group.className=klass;
        group.style.display='grid';
        group.style.gridTemplateColumns='repeat(2,minmax(0,1fr))';
        for (let n=0;n<2;n++) {
          const field=document.createElement('div');
          field.className='form-group';
          const input=document.createElement('input');
          input.value='Field '+n;
          field.appendChild(input);
          group.appendChild(field);
        }
        form.appendChild(group);
      }
      shell.appendChild(form);
      document.body.appendChild(shell);
      const measured=groups.map((klass) => {
        const group=form.querySelector('.'+klass)!;
        const children=group.children;
        return {
          klass,
          colWidths:getComputedStyle(group).gridTemplateColumns.split(' ').length,
          secondBelowFirst:(children[1] as HTMLElement).getBoundingClientRect().top >=
            (children[0] as HTMLElement).getBoundingClientRect().bottom - 1,
          fieldFits: Array.from(children).every(child =>
            (child as HTMLElement).getBoundingClientRect().right <= group.getBoundingClientRect().right + 1)
        };
      });
      shell.remove();
      return measured;
    });
    if (width<=820) for (const group of result) {
      expect(group.colWidths,`${width} ${group.klass}: columns`).toBe(1);
      expect(group.secondBelowFirst,`${width} ${group.klass}: vertical order`).toBe(true);
      expect(group.fieldFits,`${width} ${group.klass}: clipped field`).toBe(true);
    }
    else for (const group of result) expect(group.colWidths).toBe(2);
  });
}
