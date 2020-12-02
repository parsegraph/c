/* eslint-disable require-jsdoc */

export default function createWeek(belt, world) {
  const car = new Caret(BUD);
  [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ].forEach(function(weekday, i) {
    if (i !== 0) {
      car.spawnMove('f', 'bu');
    }

    car.connect(
        'd',
        createDay(
            i,
            null,
            null,
            null,
            null,
            function() {
              belt.scheduleUpdate();
              world.scheduleRepaint();
            },
            this,
        ),
    );
    car.pull('d');
  }, this);
  return car.root();
}
