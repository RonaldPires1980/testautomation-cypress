const spec = require('../../dist/browser/spec-driver');

function socketCommands(socket, refer) {
  socket.command('Driver.executeScript', ({context, script, arg = []}) => {
    const res = spec.executeScript(refer.deref(context), script, derefArgs(arg));
    return refer.ref(res);
  });
  socket.command('Driver.mainContext', () => {
    return refer.ref(spec.mainContext());
  });

  socket.command('Driver.parentContext', ({context}) => {
    return refer.ref(spec.parentContext(refer.deref(context)));
  });

  socket.command('Driver.childContext', ({context, element}) => {
    return refer.ref(spec.childContext(refer.deref(context), refer.deref(element)));
  });

  socket.command('Driver.getViewportSize', () => {
    return spec.getViewportSize();
  });
  socket.command('Driver.setViewportSize', vs => {
    spec.setViewportSize(vs);
  });
  socket.command('Driver.findElement', ({context, selector, parent}) => {
    const element = spec.findElement(
      refer.deref(context),
      spec.transformSelector(selector),
      refer.deref(parent),
    );
    return element === null ? element : refer.ref(element, context);
  });
  socket.command('Driver.findElements', ({context, selector, parent}) => {
    const elements = spec.findElements(
      refer.deref(context),
      spec.transformSelector(selector),
      refer.deref(parent),
    );
    return Array.prototype.map.call(elements, element =>
      element === null ? element : refer.ref(element, context),
    );
  });

  socket.command('Driver.getUrl', context => {
    return spec.getUrl(refer.deref(context));
  });

  socket.command('Driver.getTitle', context => {
    return spec.getTitle(refer.deref(context.driver));
  });

  socket.command('Driver.getCookies', async () => {
    return await spec.getCookies();
  });

  // utils

  function derefArgs(arg) {
    const derefArg = [];
    if (Array.isArray(arg)) {
      for (const argument of arg) {
        if (Array.isArray(argument)) {
          derefArg.push(derefArgs(argument));
        } else {
          derefArg.push(refer.deref(argument));
        }
      }
      return derefArg;
    } else if (typeof arg === 'object') {
      for (const [key, value] of Object.entries(arg)) {
        derefArg[key] = refer.deref(value);
      }
      return derefArg;
    } else {
      return arg;
    }
  }
}

module.exports = {socketCommands};
