// prayers.js — All prayer content for the Angelus PWA

export const PRAYER_MODES = ['traditional', 'contemporary', 'latin'];

export const SEASON_LABELS = {
  eastertide: 'Regina Caeli · Eastertide',
  triduum:    'The Sacred Triduum · From Holy Thursday Evening',
  lent:       'Lenten Season · Fast & Prayer',
  advent:     'Advent Season · Come, Lord Jesus',
  ordinary:   'The Incarnation · Thrice Daily',
};

export function getSeason(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const year = d.getFullYear();
  const easter = getEasterDate(year);
  const easterDay = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate());

  const pentecost = new Date(easterDay);
  pentecost.setDate(easterDay.getDate() + 49);
  if (d >= easterDay && d <= pentecost) return 'eastertide';

  // Triduum: Holy Thursday evening (6pm+) through Holy Saturday
  const holyThursday = new Date(easterDay);
  holyThursday.setDate(easterDay.getDate() - 3);
  const goodFriday = new Date(easterDay);
  goodFriday.setDate(easterDay.getDate() - 2);
  const isHolyThursdayEvening = d.getTime() === holyThursday.getTime() && date.getHours() >= 18;
  if (isHolyThursdayEvening || (d >= goodFriday && d < easterDay)) return 'triduum';

  // Lent: Ash Wednesday through Holy Thursday (ends after the noon Angelus)
  const ashWednesday = new Date(easterDay);
  ashWednesday.setDate(easterDay.getDate() - 46);
  if (d >= ashWednesday && d <= holyThursday) return 'lent';

  // First Sunday of Advent is the Sunday between Nov 27 and Dec 3
  const nov27 = new Date(year, 10, 27);
  const dow = nov27.getDay();
  const adventSunday = new Date(year, 10, 27 + (dow === 0 ? 0 : 7 - dow));
  const christmasEve = new Date(year, 11, 24);
  if (d >= adventSunday && d <= christmasEve) return 'advent';

  return 'ordinary';
}

export function isEastertide(date = new Date()) {
  const year = date.getFullYear();
  const easter = getEasterDate(year);
  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const e = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate());
  const p = new Date(pentecost.getFullYear(), pentecost.getMonth(), pentecost.getDate());
  return d >= e && d <= p;
}

function getEasterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const AVE = {
  traditional: {
    title: 'Hail Mary',
    text: 'Hail Mary, full of grace, the Lord is with thee.\nBlessed art thou amongst women,\nand blessed is the fruit of thy womb, Jesus.\nHoly Mary, Mother of God,\npray for us sinners,\nnow and at the hour of our death. Amen.'
  },
  contemporary: {
    title: 'Hail Mary',
    text: 'Hail Mary, full of grace, the Lord is with you; blessed are you among women and blessed is the fruit of your womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.'
  },
  latin: {
    title: 'Ave Maria',
    text: 'Ave Maria, gratia plena, Dominus tecum.\nBenedicta tu in mulieribus,\net benedictus fructus ventris tui, Iesus.\nSancta Maria, Mater Dei,\nora pro nobis peccatoribus,\nnunc et in hora mortis nostrae. Amen.'
  }
};

export const angelus = {
  traditional: {
    title: 'The Angelus',
    subtitle: 'Versicles & Responses',
    verses: [
      { versicle: 'The Angel of the Lord declared unto Mary:', response: 'And she conceived of the Holy Ghost.', prayer: AVE.traditional },
      { versicle: 'Behold the handmaid of the Lord:', response: 'Be it done unto me according to Thy word.', prayer: AVE.traditional },
      { versicle: 'And the Word was made Flesh:', response: 'And dwelt among us.', prayer: AVE.traditional }
    ],
    collectVersicle: 'Pray for us, O holy Mother of God:',
    collectResponse: 'That we may be made worthy of the promises of Christ.',
    collectTitle: 'Let us pray.',
    collect: 'Pour forth, we beseech Thee, O Lord, Thy grace into our hearts, that we, to whom the Incarnation of Christ Thy Son was made known by the message of an Angel, may by His Passion and Cross be brought to the glory of His Resurrection, through the same Christ our Lord. Amen.',
    closing: 'V. May the divine assistance remain always with us.\nR. And with our absent brethren. Amen.'
  },
  contemporary: {
    title: 'The Angelus',
    subtitle: 'A Prayer of the Incarnation',
    verses: [
      { versicle: 'The Angel of the Lord declared to Mary:', response: 'And she conceived of the Holy Spirit.', prayer: AVE.contemporary },
      { versicle: 'Behold the handmaid of the Lord:', response: 'Be it done unto me according to Your word.', prayer: AVE.contemporary },
      { versicle: 'And the Word was made Flesh:', response: 'And dwelt among us.', prayer: AVE.contemporary }
    ],
    collectVersicle: 'Pray for us, O Holy Mother of God,',
    collectResponse: 'that we may be made worthy of the promises of Christ.',
    collectTitle: 'Let us pray.',
    collect: 'Pour forth, we beseech You, O Lord, Your grace into our hearts; that we, to whom the incarnation of Christ, Your Son, was made known by the message of an angel, may by His Passion and Cross be brought to the glory of His Resurrection, through the same Christ Our Lord. Amen.',
    closing: ''
  },
  latin: {
    title: 'Angelus Domini',
    subtitle: 'Versiculi et Responsoria',
    verses: [
      { versicle: 'Angelus Domini nuntiavit Mariae:', response: 'Et concepit de Spiritu Sancto.', prayer: AVE.latin },
      { versicle: 'Ecce ancilla Domini:', response: 'Fiat mihi secundum verbum tuum.', prayer: AVE.latin },
      { versicle: 'Et Verbum caro factum est:', response: 'Et habitavit in nobis.', prayer: AVE.latin }
    ],
    collectVersicle: 'Ora pro nobis, sancta Dei Genitrix.',
    collectResponse: 'Ut digni efficiamur promissionibus Christi.',
    collectTitle: 'Oremus.',
    collect: 'Gratiam tuam, quaesumus Domine, mentibus nostris infunde; ut qui, angelo nuntiante, Christi Filii tui Incarnationem cognovimus, per passionem eius et crucem, ad resurrectionis gloriam perducamur. Per eundem Christum Dominum nostrum. Amen.',
    closing: 'V. Divinum auxilium maneat semper nobiscum.\nR. Et cum fratribus nostris absentibus. Amen.'
  }
};

export const reginaCoeli = {
  traditional: {
    title: 'Regina Caeli',
    subtitle: 'Eastertide Antiphon',
    body: [
      { versicle: 'Queen of Heaven, rejoice, alleluia:', response: 'For He whom thou didst merit to bear, alleluia,' },
      { versicle: 'Hath risen as He said, alleluia:', response: 'Pray for us to God, alleluia.' },
      { versicle: 'Rejoice and be glad, O Virgin Mary, alleluia:', response: 'For the Lord is truly risen, alleluia.' }
    ],
    collectTitle: 'Let us pray.',
    collect: 'O God, who by the Resurrection of Thy Son, our Lord Jesus Christ, hast vouchsafed to make glad the whole world: grant, we beseech Thee, that through the intercession of the Virgin Mary His Mother, we may attain the joys of eternal life. Through the same Christ our Lord. Amen.'
  },
  contemporary: {
    title: 'Regina Caeli',
    subtitle: 'Eastertide Antiphon',
    body: [
      { versicle: 'Queen of Heaven, rejoice, alleluia.', response: 'For He whom you did merit to bear, alleluia.' },
      { versicle: 'Has risen, as he said, alleluia.', response: 'Pray for us to God, alleluia.' },
      { versicle: 'Rejoice and be glad, O Virgin Mary, alleluia.', response: 'For the Lord has truly risen, alleluia.' }
    ],
    collectTitle: 'Let us pray.',
    collect: 'O God, who gave joy to the world through the resurrection of Your Son, our Lord Jesus Christ, grant we beseech You, that through the intercession of the Virgin Mary, His Mother, we may obtain the joys of everlasting life. Through the same Christ our Lord. Amen.'
  },
  latin: {
    title: 'Regina Caeli',
    subtitle: 'Antiphona Tempore Paschali',
    body: [
      { versicle: 'Regina caeli, laetare, alleluia:', response: 'Quia quem meruisti portare, alleluia,' },
      { versicle: 'Resurrexit sicut dixit, alleluia:', response: 'Ora pro nobis Deum, alleluia.' },
      { versicle: 'Gaude et laetare, Virgo Maria, alleluia:', response: 'Quia surrexit Dominus vere, alleluia.' }
    ],
    collectTitle: 'Oremus.',
    collect: 'Deus, qui per resurrectionem Filii tui Domini nostri Iesu Christi mundum laetificare dignatus es: praesta, quaesumus, ut per eius Genetricem Virginem Mariam perpetuae capiamus gaudia vitae. Per eundem Christum Dominum nostrum. Amen.'
  }
};
