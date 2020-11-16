function viewList(itemCreator) {
  var listView = document.createElement("div");

  listView.appendChild(itemCreator());

  var button = document.createElement("button");
  button.className = "addAnother visual";
  button.innerHTML = "Add another.";
  addEventListener(button, "click", function () {
    // Insert a new element.
    var item = itemCreator();
    listView.insertBefore(item, button);
  });
  listView.appendChild(button);

  return listView;
}
