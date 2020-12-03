import TestSuite from './TestSuite';
/* eslint-disable require-jsdoc, max-len */

export function datesEqual(a, b) {
  if (a == undefined || b == undefined) {
    return a == undefined && b == undefined;
  }
  return (
    a.getDate() == b.getDate() &&
    a.getMonth() == b.getMonth() &&
    a.getFullYear() == b.getFullYear()
  );
}

export function dateGreater(a, b) {
  if (a == undefined) {
    return false;
  }
  if (b == undefined) {
    return true;
  }

  if (a.getFullYear() <= b.getFullYear()) {
    if (a.getFullYear() !== b.getFullYear()) {
      // a.getFullYear() < b.getFullYear()
      return false;
    }
    // a.getFullYear() === b.getFullYear()
    if (a.getMonth() <= b.getMonth()) {
      if (a.getMonth() !== b.getMonth()) {
        // a.getMonth() < b.getMonth()
        return false;
      }
      // a.getMonth() === b.getMonth()
      return a.getDate() > b.getDate();
    }
    // a.getMonth() > b.getMonth()
    return true;
  }
  // a.getFullYear() > b.getFullYear()
  return true;
}

const dateTests = new TestSuite('Date');

dateTests.addTest('dateGreater', function(dom) {
  if (dateGreater(new Date(2016, 0, 1), new Date(2017, 0, 1))) {
    return '2016 is showing as greater than 2017?!';
  }
  if (!dateGreater(new Date(2018, 0, 1), new Date(2017, 0, 1))) {
    return '2018 is showing as less than 2017?!';
  }
});

function getListOfDays() {
  return [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
}

function getListOfMonths() {
  return [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
}

const OFFSET = new Date().getTime();
export function getRuntimeInMillis() {
  return getTimeInMillis() - OFFSET;
}

export function getTimeInMillis() {
  return new Date().getTime();
}

export const TIMEOUT = 40000;

export function outputMonth(d, includeYear) {
  let str = parsegraph_getListOfMonths()[d.getMonth()];
  if (includeYear || includeYear === undefined) {
    str += ' ' + d.getFullYear();
  }
  return str;
}

export function outputDate(
    d,
    includeDate,
    includeTime,
    includeToday,
) {
  let timeString = '';
  if (includeDate || includeDate === undefined) {
    if (
      datesEqual(d, new Date()) &&
      (includeToday || includeToday === undefined)
    ) {
      timeString += 'Today, ';
    }

    const dayOfWeek = getListOfDays();
    timeString += dayOfWeek[d.getDay()] + ', ';

    const months = getListOfMonths();
    timeString +=
      months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    if (includeTime || includeTime === undefined) {
      timeString += ' at ';
    }
  }
  if (includeTime || includeTime === undefined) {
    const outputMinutes = function() {
      if (d.getMinutes() < 10) {
        return '0' + d.getMinutes();
      }
      return d.getMinutes().toString();
    };
    if (d.getHours() == 12) {
      timeString += d.getHours() + ':' + outputMinutes() + ' PM';
    } else if (d.getHours() > 12) {
      timeString += d.getHours() - 12 + ':' + outputMinutes() + ' PM';
    } else if (d.getHours() == 0) {
      timeString += '12:' + outputMinutes() + ' AM';
    } else {
      timeString += d.getHours() + ':' + outputMinutes() + ' AM';
    }
  }
  return timeString;
}

export function previousMonth(d) {
  d = new Date(d);
  if (d.getMonth() == 0) {
    d.setFullYear(d.getFullYear() - 1, 11, d.getDate());
  } else {
    d.setMonth(d.getMonth() - 1);
  }
  return d;
}

export function nextMonth(d) {
  d = new Date(d);
  if (d.getMonth() == 11) {
    d.setFullYear(d.getFullYear() + 1, 0, d.getDate());
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export function previousDay(d) {
  d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  d.setDate(d.getDate() - 1);
  return d;
}

export function nextDay(d) {
  d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  d.setDate(d.getDate() + 1);
  return d;
}

export function previousWeek(d) {
  d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  d.setDate(d.getDate() - 7);
  return d;
}

export function nextWeek(d) {
  d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  d.setDate(d.getDate() + 7);
  return d;
}

export function getFirstDayOfWeek(d) {
  while (d.getDay() != 0) {
    d = previousDay(d);
  }
  return d;
}

// From http://www.itacanet.org/the-sun-as-a-source-of-energy/part-3-calculating-solar-angles/
export function getSunriseAndSunset(
    inputDatetime,
    signedLongitude,
    signedLatitude,
) {
  if (isNaN(signedLongitude)) {
    throw new Error('Longitude must not be NaN');
  }
  if (isNaN(signedLatitude)) {
    throw new Error('Latitude must not be NaN');
  }
  if (inputDatetime == null) {
    throw new Error('Input date must not be null');
  }

  // constants
  const degreesToRadians = 3.1416 / 180;
  const radiansToDegrees = 180 / 3.1416;

  // day of year
  const monthDays = MonthToYearOffset(inputDatetime);
  const dayOfYear = monthDays + inputDatetime.getDate();

  // local standard time meridian
  let meridian = -(inputDatetime.getTimezoneOffset() / 60) * 15;

  // ...calculate clock minutes after midnight
  const inputMinutesAfterMidnight = 60 * 12;

  // calculate time for purposes of determining declination and EOT adjustment;  note that this is
  // an approximation because the EOT is not taken into account;  the precise solar time value is
  // calculated below.  note that for purposes of calculating declination and EOT adjustment, if the
  // user does not enter a time, it is assumed to be 1200 UT

  // ...calculate daylight savings time adjustment
  let daylightAdjustment = 0;
  // if(inputDaylight[0].checked == true) daylightAdjustment = -60;

  // http://stackoverflow.com/questions/11887934/check-if-daylight-saving-time-is-in-effect-and-if-it-is-for-how-many-hours
  const stdTimezoneOffset = (function() {
    const jan = new Date(inputDatetime.getFullYear(), 0, 1);
    const jul = new Date(inputDatetime.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  })();

  if (inputDatetime.getTimezoneOffset() < stdTimezoneOffset) {
    daylightAdjustment -= 60;
    meridian -= 15;
  }

  // ...calculate solar minutes after midnight
  // NOTE!  This equation assumes positive longitude values are for East, and negative values are for West
  const solarMinutesAfterMidnight =
    inputMinutesAfterMidnight +
    4 * (signedLongitude - meridian) +
    daylightAdjustment;

  // In Eq. 1.4.2, if m>2 then y =y and m = m-3, otherwise y = y-1 and m = m + 9.
  // In the expression above for t, [x] denotes the integer part of x.
  const monthNum = inputDatetime.getMonth();
  if (monthNum > 2) {
    correctedYear = inputDatetime.getFullYear();
    correctedMonth = monthNum - 3;
  } else {
    correctedYear = inputDatetime.getFullYear() - 1;
    correctedMonth = monthNum + 9;
  }

  // t = {(UT/24.0) + D + [30.6m + 0.5] +[365.25(y-1976)] - 8707.5}/36525
  const t =
    (solarMinutesAfterMidnight / 60.0 / 24.0 +
      inputDatetime.getDate() +
      Math.floor(30.6 * correctedMonth + 0.5) +
      Math.floor(365.25 * (correctedYear - 1976)) -
      8707.5) /
    36525.0;
  const G = NormalizeTo360(357.528 + 35999.05 * t);
  const C =
    1.915 * Math.sin(G * degreesToRadians) +
    0.02 * Math.sin(2.0 * G * degreesToRadians);
  const L = NormalizeTo360(280.46 + 36000.77 * t + C);
  const alpha =
    L -
    2.466 * Math.sin(2.0 * L * degreesToRadians) +
    0.053 * Math.sin(4.0 * L * degreesToRadians);
  const obliquity = 23.4393 - 0.013 * t;
  const declination =
    radiansToDegrees *
    Math.atan(
        Math.tan(obliquity * degreesToRadians) *
        Math.sin(alpha * degreesToRadians),
    );
  const eotAdjustment = ((L - C - alpha) / 15.0) * 60.0;

  // console.log("t=" + t);
  // console.log("declination=" + declination);
  // console.log("signedLatitude=" + signedLatitude);

  // Get the sunrise and sunset times.
  const sunRiseSetLSoTMinutes =
    radiansToDegrees *
    Math.acos(
        (-1.0 *
        Math.sin(signedLatitude * degreesToRadians) *
        Math.sin(declination * degreesToRadians)) /
        Math.cos(signedLatitude * degreesToRadians) /
        Math.cos(declination * degreesToRadians),
    ) *
    4;
  // console.log("sunRiseSetLSoTMinutes=" + sunRiseSetLSoTMinutes);

  // if longitude differs greatly from meridian, warn about longitude east/west problem and time zone selection
  if (Math.abs(signedLongitude - meridian) > 30) {
    console.log(
        'WARNING: Longitude (' +
        signedLongitude +
        ') differs from time zone meridian (' +
        meridian +
        ') by > 30 degrees...check longitude east-west designation and/or time zone and recalculate if necessary. (dist=' +
        Math.abs(signedLongitude - meridian) +
        ')',
    );
  }

  // [sunrise in minutes since midnight, sunset in minutes since midnight]
  return [
    12 * 60 -
      sunRiseSetLSoTMinutes -
      4 * (signedLongitude - meridian) -
      eotAdjustment -
      daylightAdjustment,
    12 * 60 +
      sunRiseSetLSoTMinutes -
      4 * (signedLongitude - meridian) -
      eotAdjustment -
      daylightAdjustment,
  ];
}

export function NormalizeTo360(n) {
  return n - Math.floor(n / 360.0) * 360;
}

const daysInMonths = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
export function MonthToYearOffset(d) {
  return daysInMonths[d.getMonth()];
}
