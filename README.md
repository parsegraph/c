# graph-js

graph-js contains the JavaScript and C implementations of the Parsegraph API.
The Parsegraph API can be used to render a user-navigable 2D environment of 
connected blocks, slots, scenes, sliders, and buds. The JavaScript implementation
is contained in an HTML5 canvas and uses a WebGLRenderingContext. The C implementation
contains an unfinished window manager-less KMS-based C port of the JavaScript API that
can be used from runlevel=3 in the Fedora distro of Linux.

graph-js is MIT licensed. Therefore, you are free to use it and fork it in your own work,
commercial or otherwise.

graph-js uses Autoconf, Automake, and libtool for its build system. Building the project
will produce two JavaScript libraries: parsegraph-1.0.js and parsegraph-widgets-1.0.js.

The [Documentation](https://parsegraph.com/doc/) contains documentation for most JavaScript source files.
e.g. [graph/Node.js](https://parsegraph.com/doc/graph-Node.html) is documented at [https://parsegraph.com/doc/graph-Node.html](https://parsegraph.com/doc/graph-Node.html).

There are also a number of demos:

1. [alpha.html](https://parsegraph.com/alpha.html) contains a 3d scene from a different project. I used it as a basis for my GL work.
<a href="https://parsegraph.com/alpha.html">![Alpha](https://parsegraph.com/alpha.png)</a>
2. [audio.html](https://parsegraph.com/audio.html) contains a few blocks that interact with the Web Audio API.
<a href="https://parsegraph.com/audio.html">![Audio](https://parsegraph.com/audio.png)</a>
3. [builder.html](https://parsegraph.com/builder.html) lets you build blocks endlessly.
<a href="https://parsegraph.com/builder.html">![Builder](https://parsegraph.com/builder.png)</a>
4. [calendar.html](https://parsegraph.com/calendar.html) shows some years, and some detail on the next two weeks.
<a href="https://parsegraph.com/calendar.html">![Calendar](https://parsegraph.com/calendar.png)</a>
5. [corporate.html](https://parsegraph.com/corporate.html) shows the structure of a multi-industrial corporation.
<a href="https://parsegraph.com/corporate.html">![Corporate](https://parsegraph.com/corporate.png)</a>
6. [finish.html](https://parsegraph.com/finish.html) shows a Weetcubes 3D scene embedded in a 2D environment.
<a href="https://parsegraph.com/finish.html">![Finish](https://parsegraph.com/finish.png)</a>
7. [ip.html](https://parsegraph.com/ip.html) shows a lot of scaled blocks.
<a href="https://parsegraph.com/ip.html">![IP](https://parsegraph.com/ip.png)</a>
8. [lisp.html](https://parsegraph.com/lisp.html) shows the parsed contents of a Lisp file.
<a href="https://parsegraph.com/lisp.html">![Lisp](https://parsegraph.com/lisp.png)</a>
9. [login.html](https://parsegraph.com/login.html) shows the login widget.
10. [piers.html](https://parsegraph.com/piers.html) shows a bunch of columns. Good stress test.
<a href="https://parsegraph.copm/piers.html">![Piers](https://parsegraph.com/piers.png)</a>
11. [primes.html](https://parsegraph.com/primes.html) graphs the natural numbers, constructing a column of each number's multiples, revealing an Ulam-like pattern.
<a href="https://parsegraph.com/primes.html">![Primes](https://parsegraph.com/primes.png)</a>
12. [proportion.html](https://parsegraph.com/proportion.html) shows a stress test for the layout algorithm. 
<a href="https://parsegraph.com/proportion.html">![Proportion](https://parsegraph.com/proportion.png)</a>
13. [start.html](https://parsegraph.com/start.html) is a minimal use case. Useful for new projects as a template.
14. [test.html](https://parsegraph.com/test.html) runs the test suite for this project.
15. [ulam.html](https://parsegraph.com/ulam.html) shows the Ulam spiral. This is also a good stress test for user input.
<a href="https://parsegraph.com/ulam.html">![Ulam](https://parsegraph.com/ulam.png)</a>
16. [weetcubes.html](https://parsegraph.com/weetcubes.html) is a audio-enabled 3D simulation. Escape to start/stop time, Enter to change audio mode. WASD to slow-move, TFGH to fast-move, UIOJKL to rotate.
<a href="https://parsegraph.com/weetcubes.html">![Weetcubes](https://parsegraph.com/weetcubes.png)</a>
