// eslint-disable-next-line require-jsdoc
export default function viewList(itemCreator) {
  const listView = document.createElement('div');

  listView.appendChild(itemCreator());

  const button = document.createElement('button');
  button.className = 'addAnother visual';
  button.innerHTML = 'Add another.';
  addEventListener(button, 'click', function() {
    // Insert a new element.
    const item = itemCreator();
    listView.insertBefore(item, button);
  });
  listView.appendChild(button);

  return listView;
}
