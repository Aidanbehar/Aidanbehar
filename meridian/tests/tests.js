/*
 * Shared test definitions for the Meridian engine. Run in Node (`node tests/run-node.js`)
 * or in the browser (open tests/index.html, or Settings → About → Run self-tests).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.MeridianTests = factory;
})(typeof self !== 'undefined' ? self : this, function defineTests(TE) {
  const results = [];
  const fmt = (v) => typeof v === 'object' ? JSON.stringify(v) : String(v);
  function test(group, name, fn) {
    try { fn(); results.push({ group, name, pass: true }); }
    catch (e) { results.push({ group, name, pass: false, error: e && e.message || String(e) }); }
  }
  function eq(actual, expected, msg) {
    if (fmt(actual) !== fmt(expected)) throw new Error(`${msg ? msg + ': ' : ''}expected ${fmt(expected)}, got ${fmt(actual)}`);
  }
  function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }
  function near(a, b, tol, msg) { if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg ? msg + ': ' : ''}expected ${b} ± ${tol}, got ${a}`); }

  const LA = TE.zoneIana('America/Los_Angeles'), BER = TE.zoneIana('Europe/Berlin'), NY = TE.zoneIana('America/New_York');
  const PST = TE.zoneFixed(-8 * 3600, 'PST'), UTC = TE.UTC;
  const conv = (srcZone, wall, dstZone) => {
    const r = TE.resolveLocal(srcZone, wall);
    if (r.status !== 'ok') throw new Error('unexpected status ' + r.status);
    const z = TE.toZoned(dstZone, r.candidates[0].epochMs);
    return `${TE.isoDate(z)} ${TE.pad(z.h)}:${TE.pad(z.mi)}`;
  };
  const W = (y, m, d, h = 0, mi = 0, s = 0, ms = 0) => ({ y, m, d, h, mi, s, ms });
  const instant = (zone, wall) => TE.resolveLocal(zone, wall).candidates[0].epochMs;

  /* 1. Leap years */
  test('Leap years', '1900 is not a leap year', () => eq(TE.isLeapYear(1900), false));
  test('Leap years', '2000 is a leap year', () => eq(TE.isLeapYear(2000), true));
  test('Leap years', '2024 is a leap year', () => eq(TE.isLeapYear(2024), true));
  test('Leap years', '2100 is not a leap year', () => eq(TE.isLeapYear(2100), false));
  test('Leap years', '2023 is not a leap year; Feb 2024 has 29 days', () => { eq(TE.isLeapYear(2023), false); eq(TE.daysInMonth(2024, 2), 29); eq(TE.daysInMonth(2023, 2), 28); });
  test('Leap years', 'Leap years 2000–2100 inclusive = 25', () => eq(TE.countLeapYears(2000, 2100), 25));
  test('Leap years', 'Leap years 1901–2000 inclusive = 25', () => eq(TE.countLeapYears(1901, 2000), 25));
  test('Leap years', 'countLeapYears matches brute force for 1582–2400', () => { let c = 0; for (let y = 1582; y <= 2400; y++) if (TE.isLeapYear(y)) c++; eq(TE.countLeapYears(1582, 2400), c); });

  /* 2. Weekdays */
  const wd = (y, m, d) => TE.WEEKDAYS[TE.weekday(y, m, d)];
  test('Weekdays', '1969-07-20 (Apollo 11 landing) was a Sunday', () => eq(wd(1969, 7, 20), 'Sunday'));
  test('Weekdays', '1776-07-04 was a Thursday', () => eq(wd(1776, 7, 4), 'Thursday'));
  test('Weekdays', '2000-01-01 was a Saturday', () => eq(wd(2000, 1, 1), 'Saturday'));
  test('Weekdays', '1941-12-07 was a Sunday', () => eq(wd(1941, 12, 7), 'Sunday'));
  test('Weekdays', '1989-11-09 was a Thursday', () => eq(wd(1989, 11, 9), 'Thursday'));
  test('Weekdays', '2011-08-04 was a Thursday', () => eq(wd(2011, 8, 4), 'Thursday'));
  test('Weekdays', '1582-10-15 (first Gregorian day) was a Friday', () => eq(wd(1582, 10, 15), 'Friday'));
  test('Weekdays', '2026-10-13 is a Tuesday', () => eq(wd(2026, 10, 13), 'Tuesday'));
  test('Weekdays', 'Engine weekday agrees with JS Date for 3000 random dates', () => {
    let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 3000; i++) {
      const days = Math.floor((rnd() - 0.5) * 2 * 1e6);
      const c = TE.civilFromDays(days);
      const d = new Date(0); d.setUTCFullYear(c.y, c.m - 1, c.d);
      if (d.getUTCDay() !== TE.weekday(c.y, c.m, c.d)) throw new Error('mismatch ' + JSON.stringify(c));
      if (TE.daysFromCivil(c.y, c.m, c.d) !== days) throw new Error('round-trip ' + days);
    }
  });
  test('Weekdays', 'Day of year: Dec 31 2024 = 366, Mar 1 2023 = 60', () => { eq(TE.dayOfYear(2024, 12, 31), 366); eq(TE.dayOfYear(2023, 3, 1), 60); });
  test('Weekdays', 'ISO week: 2021-01-03 is week 53 of 2020; 2026-10-13 is W42', () => { eq(TE.isoWeek(2021, 1, 3), { year: 2020, week: 53 }); eq(TE.isoWeek(2026, 10, 13), { year: 2026, week: 42 }); });
  test('Weekdays', 'ISO week: 2024-12-30 is week 1 of 2025', () => eq(TE.isoWeek(2024, 12, 30), { year: 2025, week: 1 }));
  test('Weekdays', 'US week: 2026-01-03 (Sat) is week 1, 2026-01-04 (Sun) is week 2', () => { eq(TE.weekNumber(2026, 1, 3, 'us').week, 1); eq(TE.weekNumber(2026, 1, 4, 'us').week, 2); });

  /* 3. Time-zone conversion */
  test('Time zones', '2019-09-17 09:30 Los Angeles → 18:30 Berlin', () => eq(conv(LA, W(2019, 9, 17, 9, 30), BER), '2019-09-17 18:30'));
  test('Time zones', '2019-09-17 09:30 literal PST (UTC−8) → 19:30 Berlin', () => eq(conv(PST, W(2019, 9, 17, 9, 30), BER), '2019-09-17 19:30'));
  test('Time zones', '2011-08-04 21:30 PST (literal) → 2011-08-05 07:30 Berlin', () => eq(conv(PST, W(2011, 8, 4, 21, 30), BER), '2011-08-05 07:30'));
  test('Time zones', '2011-08-04 21:30 Los Angeles (PDT) → 2011-08-05 06:30 Berlin', () => eq(conv(LA, W(2011, 8, 4, 21, 30), BER), '2011-08-05 06:30'));
  test('Time zones', 'Winter: 2020-01-15 12:00 New York → 18:00 Berlin', () => eq(conv(NY, W(2020, 1, 15, 12), BER), '2020-01-15 18:00'));
  test('Time zones', 'Summer: 2020-07-15 12:00 New York → 18:00 Berlin', () => eq(conv(NY, W(2020, 7, 15, 12), BER), '2020-07-15 18:00'));
  test('Time zones', 'DST mismatch week: 2024-03-15 12:00 New York → 17:00 Berlin (US already on DST, EU not)', () => eq(conv(NY, W(2024, 3, 15, 12), BER), '2024-03-15 17:00'));
  test('Time zones', 'Historical rules: 2006-03-15 12:00 New York → 18:00 Berlin (pre-2007 US DST rules)', () => eq(conv(NY, W(2006, 3, 15, 12), BER), '2006-03-15 18:00'));
  test('Time zones', 'Crossing midnight: 2023-12-31 22:00 Los Angeles → 2024-01-01 07:00 Berlin', () => eq(conv(LA, W(2023, 12, 31, 22), BER), '2024-01-01 07:00'));
  test('Time zones', 'Half-hour offset: 2024-06-01 12:00 UTC → 17:30 Kolkata', () => eq(conv(UTC, W(2024, 6, 1, 12), TE.zoneIana('Asia/Kolkata')), '2024-06-01 17:30'));
  test('Time zones', '45-minute offset: 2024-06-01 12:00 UTC → 17:45 Kathmandu', () => eq(conv(UTC, W(2024, 6, 1, 12), TE.zoneIana('Asia/Kathmandu')), '2024-06-01 17:45'));
  test('Time zones', 'Chatham Islands UTC+12:45 standard (July)', () => eq(TE.offsetAt(TE.zoneIana('Pacific/Chatham'), Date.UTC(2024, 6, 1)), 12 * 3600 + 45 * 60));
  test('Time zones', 'Lord Howe 30-minute DST: +10:30 in July, +11:00 in January', () => { const z = TE.zoneIana('Australia/Lord_Howe'); eq(TE.offsetAt(z, Date.UTC(2024, 6, 1)) / 60, 630); eq(TE.offsetAt(z, Date.UTC(2024, 0, 15)) / 60, 660); });
  test('Time zones', 'Spring-forward gap: 2024-03-10 02:30 New York does not exist', () => {
    const r = TE.resolveLocal(NY, W(2024, 3, 10, 2, 30)); eq(r.status, 'gap'); eq(r.offsetBefore, -5 * 3600); eq(r.offsetAfter, -4 * 3600);
    const z = TE.toZoned(NY, r.shiftedEpochMs); eq(`${z.h}:${z.mi}`, '3:30');
  });
  test('Time zones', 'Fall-back overlap: 2024-11-03 01:30 New York happens twice (EDT then EST)', () => {
    const r = TE.resolveLocal(NY, W(2024, 11, 3, 1, 30)); eq(r.status, 'ambiguous'); eq(r.candidates.map(c => c.offsetSec / 3600), [-4, -5]);
    eq(r.candidates[1].epochMs - r.candidates[0].epochMs, 3600000);
  });
  test('Time zones', 'Just before / after a transition: 01:59 and 03:00 on 2024-03-10 New York are valid', () => {
    eq(TE.resolveLocal(NY, W(2024, 3, 10, 1, 59)).status, 'ok'); eq(TE.resolveLocal(NY, W(2024, 3, 10, 3, 0)).status, 'ok');
    eq(TE.resolveLocal(NY, W(2024, 3, 10, 1, 59)).candidates[0].offsetSec, -5 * 3600);
  });
  test('Time zones', 'Berlin 2024-03-31 02:30 is a gap; 2024-10-27 02:30 is ambiguous', () => { eq(TE.resolveLocal(BER, W(2024, 3, 31, 2, 30)).status, 'gap'); eq(TE.resolveLocal(BER, W(2024, 10, 27, 2, 30)).status, 'ambiguous'); });
  test('Time zones', 'Samoa skipped 2011-12-30 entirely (date-line change)', () => {
    const z = TE.zoneIana('Pacific/Apia'); eq(TE.resolveLocal(z, W(2011, 12, 30, 12)).status, 'gap'); eq(TE.resolveLocal(z, W(2011, 12, 31, 12)).status, 'ok');
  });
  test('Time zones', 'Next transition after 2024-06-01 in New York is 2024-11-03 06:00 UTC', () => { const t = TE.nextTransition(NY, Date.UTC(2024, 5, 1)); eq(new Date(t.epochMs).toISOString(), '2024-11-03T06:00:00.000Z'); });
  test('Time zones', 'DST detection: New York July is DST, January is not; Tokyo never', () => {
    eq(TE.dstInfo(NY, Date.UTC(2024, 6, 1)).isDst, true); eq(TE.dstInfo(NY, Date.UTC(2024, 0, 1)).isDst, false);
    eq(TE.dstInfo(TE.zoneIana('Asia/Tokyo'), Date.UTC(2024, 6, 1)).observesDst, false);
  });
  test('Time zones', 'Southern hemisphere: Sydney DST in January (+11), standard in July (+10)', () => { const z = TE.zoneIana('Australia/Sydney'); eq(TE.dstInfo(z, Date.UTC(2024, 0, 10)).isDst, true); eq(TE.offsetAt(z, Date.UTC(2024, 6, 10)), 36000); });
  test('Time zones', 'Offset formatting uses UTC−08:00 / UTC+05:45', () => { eq(TE.formatOffset(-28800), 'UTC−08:00'); eq(TE.formatOffset(20700), 'UTC+05:45'); eq(TE.isoOffset(-25200), '-07:00'); });
  test('Time zones', 'parseOffset: "UTC+5:30", "-0800", "GMT"', () => { eq(TE.parseOffset('UTC+5:30'), 19800); eq(TE.parseOffset('-0800'), -28800); eq(TE.parseOffset('GMT'), 0); eq(TE.parseOffset('banana'), null); });

  /* 4. Elapsed time */
  test('Elapsed time', 'LA 2011-08-04 21:30 → Berlin 2011-08-06 14:15 = 31h 45m', () => {
    const a = instant(LA, W(2011, 8, 4, 21, 30)), b = instant(BER, W(2011, 8, 6, 14, 15));
    eq(b - a, (31 * 60 + 45) * 60000);
  });
  test('Elapsed time', 'Reversed endpoints give a negative duration', () => {
    const a = instant(LA, W(2011, 8, 4, 21, 30)), b = instant(BER, W(2011, 8, 6, 14, 15));
    eq(a - b, -(31 * 60 + 45) * 60000); eq(TE.breakdown(a - b).sign, -1);
  });
  test('Elapsed time', 'Across midnight: 23:00 → 01:30 next day = 2.5h (UTC)', () => eq(instant(UTC, W(2024, 5, 1, 1, 30)) - instant(UTC, W(2024, 4, 30, 23)), 2.5 * 3600000));
  test('Elapsed time', 'Across a month boundary: Jan 31 12:00 → Feb 1 12:00 = 24h', () => eq(instant(BER, W(2024, 2, 1, 12)) - instant(BER, W(2024, 1, 31, 12)), 24 * 3600000));
  test('Elapsed time', 'Across a year boundary: Dec 31 18:00 → Jan 1 06:00 NY = 12h', () => eq(instant(NY, W(2025, 1, 1, 6)) - instant(NY, W(2024, 12, 31, 18)), 12 * 3600000));
  test('Elapsed time', 'Across spring-forward: NY 2024-03-09 12:00 → 03-10 12:00 = 23h', () => eq(instant(NY, W(2024, 3, 10, 12)) - instant(NY, W(2024, 3, 9, 12)), 23 * 3600000));
  test('Elapsed time', 'Across fall-back: NY 2024-11-02 12:00 → 11-03 12:00 = 25h', () => eq(instant(NY, W(2024, 11, 3, 12)) - instant(NY, W(2024, 11, 2, 12)), 25 * 3600000));
  test('Elapsed time', 'Exactly 24h after NY 2024-03-09 12:00 is 03-10 13:00 local, not 12:00', () => {
    const z = TE.toZoned(NY, instant(NY, W(2024, 3, 9, 12)) + 24 * 3600000); eq(`${TE.isoDate(z)} ${z.h}:${TE.pad(z.mi)}`, '2024-03-10 13:00');
  });
  test('Elapsed time', 'Breakdown of 90061001 ms = 1d 1h 1m 1s 1ms; totals', () => {
    eq(TE.breakdown(90061001), { sign: 1, days: 1, hours: 1, minutes: 1, seconds: 1, milliseconds: 1 });
    near(TE.durationTotals(90061001).hours, 25.0169447, 1e-6);
  });

  /* 5. Date calculators */
  const d = (y, m, dd) => ({ y, m, d: dd });
  const iso = (x) => TE.isoDate(x);
  test('Date arithmetic', '2024-02-28 + 1 day = 2024-02-29; 2023-02-28 + 1 = 2023-03-01', () => { eq(iso(TE.addDays(d(2024, 2, 28), 1)), '2024-02-29'); eq(iso(TE.addDays(d(2023, 2, 28), 1)), '2023-03-01'); });
  test('Date arithmetic', '2024-01-01 − 1 day = 2023-12-31; + 365 days = 2024-12-31', () => { eq(iso(TE.addDays(d(2024, 1, 1), -1)), '2023-12-31'); eq(iso(TE.addDays(d(2024, 1, 1), 365)), '2024-12-31'); });
  test('Date arithmetic', 'Month-end clamping: Jan 31 + 1 month = Feb 29 (2024) / Feb 28 (2023)', () => { eq(iso(TE.addMonths(d(2024, 1, 31), 1)), '2024-02-29'); eq(iso(TE.addMonths(d(2023, 1, 31), 1)), '2023-02-28'); eq(TE.addMonths(d(2023, 1, 31), 1).clamped, true); });
  test('Date arithmetic', 'Mar 31 − 1 month = Feb 29 2024; Oct 31 + 1 month = Nov 30', () => { eq(iso(TE.addMonths(d(2024, 3, 31), -1)), '2024-02-29'); eq(iso(TE.addMonths(d(2024, 10, 31), 1)), '2024-11-30'); });
  test('Date arithmetic', 'Months across years: 2024-11-15 + 3 months = 2025-02-15; − 14 months = 2023-09-15', () => { eq(iso(TE.addMonths(d(2024, 11, 15), 3)), '2025-02-15'); eq(iso(TE.addMonths(d(2024, 11, 15), -14)), '2023-09-15'); });
  test('Date arithmetic', 'Leap day + 1 year = 2025-02-28; + 4 years = 2028-02-29', () => { eq(iso(TE.addYears(d(2024, 2, 29), 1)), '2025-02-28'); eq(iso(TE.addYears(d(2024, 2, 29), 4)), '2028-02-29'); });
  test('Date arithmetic', 'Days between 2024-01-01 and 2025-01-01 = 366', () => eq(TE.daysBetween(d(2024, 1, 1), d(2025, 1, 1)), 366));
  test('Date arithmetic', 'Invalid dates rejected: 2023-02-29, 2024-02-30, 2024-04-31, 2024-13-01', () => { eq(TE.isValidDate(2023, 2, 29), false); eq(TE.isValidDate(2024, 2, 30), false); eq(TE.isValidDate(2024, 4, 31), false); eq(TE.isValidDate(2024, 13, 1), false); eq(TE.isValidDate(2024, 2, 29), true); });
  test('Date arithmetic', 'parseISODate rejects 2024-02-30 instead of rolling into March', () => { eq(TE.parseISODate('2024-02-30').ok, false); eq(TE.parseISODate('2024-02-29').ok, true); });
  test('Date arithmetic', 'Calendar diff 2024-01-31 → 2024-03-01 = 1 month 1 day', () => { const r = TE.calendarDiff(d(2024, 1, 31), d(2024, 3, 1)); eq([r.years, r.months, r.days], [0, 1, 1]); });
  test('Date arithmetic', 'Calendar diff 2000-02-29 → 2024-02-28 = 23y 11m 30d', () => { const r = TE.calendarDiff(d(2000, 2, 29), d(2024, 2, 28)); eq([r.years, r.months, r.days], [23, 11, 30]); });
  test('Date arithmetic', 'Calendar diff reversed is negative', () => { const r = TE.calendarDiff(d(2024, 3, 1), d(2024, 1, 31)); eq([r.years, r.months, r.days], [0, -1, -1]); });
  test('Date arithmetic', 'Nth weekday: Thanksgiving 2026 = Nov 26; last Monday of May 2026 = May 25; 5th Friday of Feb 2026 = none', () => {
    eq(iso(TE.nthWeekdayOfMonth(2026, 11, 4, 4)), '2026-11-26'); eq(iso(TE.nthWeekdayOfMonth(2026, 5, 1, -1)), '2026-05-25'); eq(TE.nthWeekdayOfMonth(2026, 2, 5, 5), null);
  });
  test('Date arithmetic', 'Business days Mon 2026-10-12 → Fri 2026-10-23 inclusive = 10', () => eq(TE.countBusinessDays(d(2026, 10, 12), d(2026, 10, 23)).count, 10));
  test('Date arithmetic', 'Business days excluding a holiday', () => eq(TE.countBusinessDays(d(2026, 10, 12), d(2026, 10, 23), undefined, new Set(['2026-10-12'])).count, 9));

  /* 6. Easter */
  const ew = (y) => iso(TE.easterWestern(y)), eo = (y) => iso(TE.easterOrthodox(y));
  test('Easter', 'Western: 2000-04-23, 2019-04-21, 2024-03-31, 2025-04-20, 2026-04-05, 2027-03-28', () => { eq(ew(2000), '2000-04-23'); eq(ew(2019), '2019-04-21'); eq(ew(2024), '2024-03-31'); eq(ew(2025), '2025-04-20'); eq(ew(2026), '2026-04-05'); eq(ew(2027), '2027-03-28'); });
  test('Easter', 'Western extremes: 1818-03-22 (earliest), 1943-04-25 (latest)', () => { eq(ew(1818), '1818-03-22'); eq(ew(1943), '1943-04-25'); });
  test('Easter', 'Orthodox: 2019-04-28, 2023-04-16, 2024-05-05, 2025-04-20, 2026-04-12', () => { eq(eo(2019), '2019-04-28'); eq(eo(2023), '2023-04-16'); eq(eo(2024), '2024-05-05'); eq(eo(2025), '2025-04-20'); eq(eo(2026), '2026-04-12'); });
  test('Easter', 'Easter always falls on a Sunday (1583–3000, both traditions)', () => { for (let y = 1583; y <= 3000; y++) { const a = TE.easterWestern(y), b = TE.easterOrthodox(y); if (TE.weekday(a.y, a.m, a.d) !== 0 || TE.weekday(b.y, b.m, b.d) !== 0) throw new Error('not Sunday in ' + y); } });
  test('Easter', 'nextEaster on Easter day reports today', () => { const r = TE.nextEaster(d(2026, 4, 5)); eq(r.isToday, true); eq(iso(r.nextAfterToday), '2027-03-28'); });
  test('Easter', 'nextEaster the day after rolls to next year', () => eq(iso(TE.nextEaster(d(2026, 4, 6)).date), '2027-03-28'));

  /* 7. Friday the 13th */
  const f13 = (y) => TE.friday13InYear(y).map(x => x.m);
  test('Friday 13th', '2015: Feb, Mar, Nov', () => eq(f13(2015), [2, 3, 11]));
  test('Friday 13th', '2023: Jan, Oct', () => eq(f13(2023), [1, 10]));
  test('Friday 13th', '2024: Sep, Dec', () => eq(f13(2024), [9, 12]));
  test('Friday 13th', '2025: Jun', () => eq(f13(2025), [6]));
  test('Friday 13th', '2026: Feb, Mar, Nov', () => eq(f13(2026), [2, 3, 11]));
  test('Friday 13th', 'Next after 2026-10-13 is 2026-11-13; previous is 2026-03-13', () => { eq(iso(TE.nextFriday13(d(2026, 10, 13))), '2026-11-13'); eq(iso(TE.previousFriday13(d(2026, 10, 13))), '2026-03-13'); });
  test('Friday 13th', 'Every year has 1–3 Friday 13ths (1900–2400)', () => { for (let y = 1900; y <= 2400; y++) { const n = TE.friday13InYear(y).length; if (n < 1 || n > 3) throw new Error(y + ':' + n); } });

  /* 8. Unix & ISO */
  test('Unix / ISO', 'Unix 1312518600 (s) = 2011-08-05T04:30:00Z', () => { const r = TE.parseUnix('1312518600'); eq(r.unit, 's'); eq(new Date(r.epochMs).toISOString(), '2011-08-05T04:30:00.000Z'); });
  test('Unix / ISO', 'Unix 1312518600123 auto-detected as milliseconds', () => { const r = TE.parseUnix('1312518600123'); eq(r.unit, 'ms'); eq(r.epochMs, 1312518600123); });
  test('Unix / ISO', 'Unix seconds with fraction keep milliseconds: 1.5 s = 1500 ms; negative −1.25 s', () => { eq(TE.parseUnix('1.5', 's').epochMs, 1500); eq(TE.parseUnix('-1.25', 's').epochMs, -1250); });
  test('Unix / ISO', 'Unix rejects non-numbers', () => eq(TE.parseUnix('12abc').ok, false));
  test('Unix / ISO', 'ISO 2011-08-04T21:30:00-07:00 → 2011-08-05T04:30:00Z', () => eq(new Date(TE.parseISO8601('2011-08-04T21:30:00-07:00').epochMs).toISOString(), '2011-08-05T04:30:00.000Z'));
  test('Unix / ISO', 'ISO positive offset 2024-06-01T17:45:00+05:45 → 12:00Z', () => eq(new Date(TE.parseISO8601('2024-06-01T17:45:00+05:45').epochMs).toISOString(), '2024-06-01T12:00:00.000Z'));
  test('Unix / ISO', 'ISO preserves fractional seconds (ms and beyond)', () => { const r = TE.parseISO8601('2024-01-01T00:00:00.123456Z'); eq(r.fraction, '123456'); eq(r.wall.ms, 123); eq(r.epochMs % 1000, 123); });
  test('Unix / ISO', 'ISO without offset is local (no instant)', () => { const r = TE.parseISO8601('2024-01-01T10:00'); eq(r.offsetSec, null); eq(r.epochMs, null); });
  test('Unix / ISO', 'ISO week date 2026-W42-2 = 2026-10-13; ordinal 2026-286 = 2026-10-13', () => { eq(iso(TE.parseISO8601('2026-W42-2').wall), '2026-10-13'); eq(iso(TE.parseISO8601('2026-286').wall), '2026-10-13'); });
  test('Unix / ISO', 'ISO rejects 2023-02-29 and 25:00', () => { eq(TE.parseISO8601('2023-02-29').ok, false); eq(TE.parseISO8601('2023-01-01T25:00').ok, false); });
  test('Unix / ISO', 'Basic format 20240601T120000Z', () => eq(new Date(TE.parseISO8601('20240601T120000Z').epochMs).toISOString(), '2024-06-01T12:00:00.000Z'));

  /* 9. Misc parsing & astronomy */
  test('Parsing', '04/05/2011 is ambiguous (April 5 or May 4)', () => { const r = TE.parseFlexibleDate('04/05/2011'); eq(r.ambiguous, true); eq(r.interpretations.map(i => i.m + '/' + i.d), ['4/5', '5/4']); });
  test('Parsing', '13/05/2011 has a single (DD/MM) interpretation', () => { const r = TE.parseFlexibleDate('13/05/2011'); eq(r.ambiguous, false); eq(r.interpretations[0].format, 'DD/MM/YYYY'); });
  test('Parsing', '"February 30, 2024" is rejected', () => eq(TE.parseFlexibleDate('February 30, 2024').ok, false));
  test('Parsing', '"4 August 2011" and "Aug 4, 2011" parse', () => { eq(iso(TE.parseFlexibleDate('4 August 2011').interpretations[0]), '2011-08-04'); eq(iso(TE.parseFlexibleDate('Aug 4, 2011').interpretations[0]), '2011-08-04'); });
  test('Parsing', 'parseTime: "9:30 PM" = 21:30, "12:05 AM" = 00:05, "24:00" invalid', () => { eq(TE.parseTime('9:30 PM').time.h, 21); eq(TE.parseTime('12:05 AM').time.h, 0); eq(TE.parseTime('24:00').ok, false); });
  const utcMin = (ms) => Math.round(ms / 60000);
  test('Astronomy', 'March equinox 2024 ≈ 2024-03-20 03:06 UTC (±3 min)', () => near(utcMin(TE.seasonEvent(2024, 0).epochMs), utcMin(Date.UTC(2024, 2, 20, 3, 6)), 3));
  test('Astronomy', 'June solstice 2024 ≈ 2024-06-20 20:51 UTC (±3 min)', () => near(utcMin(TE.seasonEvent(2024, 1).epochMs), utcMin(Date.UTC(2024, 5, 20, 20, 51)), 3));
  test('Astronomy', 'December solstice 2024 ≈ 2024-12-21 09:21 UTC (±3 min)', () => near(utcMin(TE.seasonEvent(2024, 3).epochMs), utcMin(Date.UTC(2024, 11, 21, 9, 21)), 3));
  test('Astronomy', 'Full moon 2024-01-25 17:54 UTC (±5 min)', () => { const p = TE.moonPhasesBetween(Date.UTC(2024, 0, 20), Date.UTC(2024, 0, 30)).find(x => x.phase === 2); near(utcMin(p.epochMs), utcMin(Date.UTC(2024, 0, 25, 17, 54)), 5); });
  test('Astronomy', 'New moon 2024-04-08 18:21 UTC (eclipse day, ±5 min)', () => { const p = TE.moonPhasesBetween(Date.UTC(2024, 3, 1), Date.UTC(2024, 3, 15)).find(x => x.phase === 0); near(utcMin(p.epochMs), utcMin(Date.UTC(2024, 3, 8, 18, 21)), 5); });
  test('Astronomy', 'London sunrise 2024-06-21 ≈ 03:43 UTC, sunset ≈ 20:21 UTC (±3 min)', () => {
    const s = TE.solarEvents({ y: 2024, m: 6, d: 21 }, 51.5074, -0.1278);
    near(utcMin(s.sunrise.epochMs), utcMin(Date.UTC(2024, 5, 21, 3, 43)), 3); near(utcMin(s.sunset.epochMs), utcMin(Date.UTC(2024, 5, 21, 20, 21)), 3);
  });
  test('Astronomy', 'Polar: Tromsø has midnight sun on June 21 and polar night on Dec 21', () => {
    eq(TE.solarEvents({ y: 2024, m: 6, d: 21 }, 69.65, 18.96).sunrise.none, 'above'); eq(TE.solarEvents({ y: 2024, m: 12, d: 21 }, 69.65, 18.96).sunrise.none, 'below');
  });
  test('Holidays', 'US 2026: Thanksgiving Nov 26, MLK Jan 19, Independence Day observed Fri Jul 3', () => {
    const h = TE.holidaysFor('US', 2026); const f = (n) => h.find(x => x.name === n);
    eq(iso(f('Thanksgiving Day').date), '2026-11-26'); eq(iso(f('Birthday of Martin Luther King, Jr.').date), '2026-01-19'); eq(iso(f('Independence Day (observed)').date), '2026-07-03');
  });
  test('Holidays', 'UK 2021: Christmas & Boxing substitute days on Dec 27/28', () => { const h = TE.holidaysFor('GB', 2021).filter(x => x.date.m === 12).map(x => iso(x.date)); eq(h, ['2021-12-27', '2021-12-28']); });

  return results;
});
