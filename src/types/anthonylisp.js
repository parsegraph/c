function parsegraph_lisp_expression(app, car, id, value, items) {
  const node = car.node();
  node.setType(parsegraph_BUD);

  for (const i in items) {
    car.push();
    car.spawnMove('f', 'u');
    const item = items[i];
    app.spawn(car, item);
    car.pop();
    car.spawnMove('d', 'u');
  }

  const actions = new parsegraph_ActionCarousel(app.graph());
  actions.addAction(
      'Add expression',
      function() {
        parsegraph_pushListItem(app, id, 'lisp::expression', '');
      },
      this,
  );
  actions.install(car.node());

  app.listen(
      id,
      function(ev) {
        const node = this;
        switch (ev.event) {
          case 'destroyListItem':
            break;
          case 'pushListItem':
            var item = ev.item;
            car.push();
            car.spawnMove('f', 'u');
            app.spawn(car, item);
            car.pop();
            car.spawnMove('d', 'u');
            actions.install(car.node());
            app.graph().scheduleRepaint();
            break;
        }
      },
      node,
  );
}

parsegraph_listClasses['lisp'] = {
  spawn: function(app, car, id, value, items) {
    const node = car.node();
    node.setType(parsegraph_BLOCK);
    car.label('Lisp');
    car.spawnMove('d', 'u');

    parsegraph_lisp_expression(app, car, id, value, items);
  },
};

parsegraph_listClasses['lisp::expression'] = {
  spawn: function(app, car, id, value, items) {
    const actions = new parsegraph_ActionCarousel(app.graph());
    actions.addAction(
        'Add symbol',
        function() {
          parsegraph_pushListItem(app, id, 'lisp::expression::symbol', '');
        },
        this,
    );
    actions.addAction(
        'New line',
        function() {
          parsegraph_pushListItem(app, id, 'lisp::expression::newline', null);
        },
        this,
    );
    actions.addAction(
        'Add quote',
        function() {
          parsegraph_pushListItem(app, id, 'lisp::expression::quote', '');
        },
        this,
    );
    actions.addAction(
        'Add list',
        function() {
          parsegraph_pushListItem(app, id, 'lisp::list');
        },
        this,
    );
    actions.addAction(
        'Delete',
        function() {
          parsegraph_destroyListItem(app, id);
        },
        this,
    );

    const node = car.node();
    car.push();
    for (const i in items) {
      const item = items[i];
      if (item.type === 'lisp::expression::newline') {
        actions.install(car.node());
        car.pop();
        car.spawnMove('d', 'u');
        car.push();
        app.graph().scheduleRepaint();
      } else {
        app.spawn(car, item);
      }
      car.pull('f');
      car.spawnMove('f', 'u');
    }
    actions.install(car.node(), id);

    app.listen(
        id,
        function(ev) {
          const node = this;
          switch (ev.event) {
            case 'pushListItem':
              var item = ev.item;
              if (item.type === 'lisp::expression::newline') {
                car.pop();
                car.spawnMove('d', 'u');
                car.push();
                car.spawnMove('f', 'u');
                actions.install(car.node(), id);
                app.graph().scheduleRepaint();
                break;
              }
              app.spawn(car, item);
              car.spawnMove('f', 'u');
              actions.install(car.node());
              app.graph().scheduleRepaint();
              break;
          }
        },
        node,
    );
  },
};

parsegraph_listClasses['lisp::expression::symbol'] = {
  spawn: function(app, car, id, value, items) {
    const actions = new parsegraph_ActionCarousel(app.graph());
    const bg = document.createElement('div');
    bg.className = 'bg';

    const container = document.createElement('div');
    parsegraph_addEventListener(
        container,
        'submit',
        function(e) {
          e.preventDefault();
          return false;
        },
        this,
    );
    container.className = 'popup';
    bg.appendChild(container);

    parsegraph_addEventListener(bg, 'click', function() {
      if (bg.parentNode) {
        bg.parentNode.removeChild(bg);
      }
    });

    const form = document.createElement('form');
    const h = document.createElement('h3');
    h.innerHTML = 'Value';
    form.appendChild(h);
    container.appendChild(form);
    parsegraph_addEventListener(container, 'click', function(e) {
      e.stopImmediatePropagation();
    });

    const valueField = document.createElement('textarea');
    valueField.name = 'value';
    valueField.className = 'main';
    valueField.cols = 50;
    valueField.rows = 1;
    parsegraph_addEventListener(
        valueField,
        'keypress',
        function(e) {
          switch (e.key) {
            case 'Escape':
              e.preventDefault();
              if (bg.parentNode) {
                bg.parentNode.removeChild(bg);
              }
              break;
            default:
              return;
          }
        },
        this,
    );
    form.appendChild(valueField);
    form.appendChild(document.createElement('br'));

    const submitField = document.createElement('input');
    submitField.type = 'submit';
    submitField.value = 'Update value';
    form.appendChild(submitField);

    app.listen(
        id,
        function(e) {
          if (e.event == 'parsegraph_editItem') {
            car.label(JSON.parse(e.value));
            if (bg.parentNode) {
              bg.parentNode.removeChild(bg);
            }
            app.graph().scheduleRepaint();
          }
        },
        this,
    );

    parsegraph_addEventListener(submitField, 'click', function() {
      parsegraph_editItem(app, id, valueField.value);
    });
    actions.addAction(
        'Edit',
        function() {
          if (bg.parentNode) {
            bg.parentNode.removeChild(bg);
          } else {
            document.body.appendChild(bg);
            permissionForm.refresh();
            parsegraph_addEventListener(
                valueField,
                'keydown',
                function(e) {
                  if (e.key === 'Escape') {
                    bg.parentNode && bg.parentNode.removeChild(bg);
                  }
                },
                this,
            );
            valueField.value = car.node().label();
            valueField.focus();
          }
        },
        this,
    );
    actions.addAction('Insert Before', function() {}, this);
    actions.addAction('Insert After', function() {}, this);
    actions.addAction(
        'Delete',
        function() {
          parsegraph_destroyListItem(app, id);
        },
        this,
    );

    var permissionForm = new parsegraph_PermissionsForm(app, id);
    container.appendChild(permissionForm.container());

    car.replace('b');
    car.label(JSON.parse(value));
    actions.install(car.node(), id);
  },
};

parsegraph_listClasses['lisp::expression::quote'] = {
  spawn: function(app, car, id, value, items) {
    car.replace('b');
    car.label(JSON.parse(value));
  },
};

parsegraph_listClasses['lisp::list'] = {
  spawn: function(app, car, id, value, items) {
    car.replace('s');
    car.spawnMove('i', 'u');
    car.shrink();
    parsegraph_lisp_expression(app, car, id, value, items);
  },
};
