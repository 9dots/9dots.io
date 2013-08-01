module.exports = function (num) {
  var digits = [];
  var remainder;

  while (num > 0) {
    remainder = num % 62;
    digits.push(remainder);
    num = Math.floor(num / 62);

  }

  digits = digits.reverse();
  return _.chain(digits)
    .map(function(digit) {
      if (digit < 10) {
        return '' + digit;
      } else if (digit < 36) {
        return String.fromCharCode(digit + 55);
      } else {
        return String.fromCharCode(digit + 61);
      }
    })
    .join('');
};