document.addEventListener('DOMContentLoaded', () => {

  // debounce actions to avoid measuring too often/losing focus
  let debounceClose = false;
  let debounceMeasure = false;

  // control the navPos when we open #navbarSupportedContent (mobile's collapse toggle)
  let navPos = 0;
  let anchored = 0;

  const isTouchDevice = ('ontouchstart' in window);

  // allow for the dimensions to be set-up before measuring (moveX sets an offset to move gc-menu-[background/content] on the x axis)
  const dimensions = {
    // set offsets as % (0.*) or px values
    products: {
      moveX: -60
    },
    company: {
      moveX: -80
    }
  };

  // read the transition duration from navbar.scss (computedRootStyles is defined in shared.js)
  const transitionDuration = parseFloat(computedRootStyles.getPropertyValue('--gc-menu-transition-duration'));

  // binding bootstrap events with jquery
  const $navbarSupportedContent = $('#navbarSupportedContent');

  // reference constant els used in the menu
  const navbarEl = document.querySelector('.gc-navbar-nav');
  const navbarContainerEl = document.querySelector('.navbar');
  const menuContainerEl = document.querySelector('.gc-menu-container');
  const navItemEls = document.querySelectorAll('.gc-nav-item');
  const navLinkEls = document.querySelectorAll('.gc-nav-link');
  const menuEls = document.querySelectorAll('.gc-menu-wrap');
  const spacerEls = document.querySelectorAll('.gc-mobile-spacer');
  const contentEl = document.querySelector('.gc-menu-content');
  const caretEl = document.querySelector('.gc-menu-caret');
  const backgroundEl = document.querySelector('.gc-menu-background');
  const submenuEls = document.querySelectorAll('.gc-menu-submenu-wrap');
  const mobileToggleEl = document.querySelector('.navbar-toggler-icon');

  // fill these based on what we find in the submenuEls
  const submenuToggleEls = {};
  const submenuMenuEls = {};
  const submenuMenuElsByName = {};
  const debounceSubmenuFocus = [];

  // record mousePositions when interacting with submenus
  const mousePositions = {};

  // index a collection by data-* attr taken from "from" nodeList elements finding classname ending with attr
  const indexElsByName = (from, className, dataAttr) => {

    return [...from].reduce((carr, el) => {
      const attr = el.dataset[dataAttr];
      const dest = document.querySelector(`.${className}-${attr}`);

      // record the dest by attr value
      carr[attr] = dest;

      return carr;
    }, {});
  };

  // index the common els by name
  const menuElsByName = indexElsByName(navLinkEls, 'gc-menu-wrap', 'menu');
  const spacerElsByName = indexElsByName(navLinkEls, 'gc-mobile-spacer', 'menu');

  // forEach submenu collect the details
  [...submenuEls].forEach((el) => {
    submenuToggleEls[el.dataset.submenu] = el.querySelectorAll('.gc-menu-submenu-toggle');
    submenuMenuEls[el.dataset.submenu] = el.querySelectorAll('.gc-menu-submenu');
    submenuMenuElsByName[el.dataset.submenu] = indexElsByName(submenuToggleEls[el.dataset.submenu], 'gc-menu-submenu', 'submenu');
  });

  // remove transform (rotate()) during measure so that the height/width isn't skewed
  const showMenuContainerEl = () => {
    menuContainerEl.classList.add('show');
    menuContainerEl.style.transform = 'unset';
    menuContainerEl.style.transition = 'unset';
  };

  // hide it again (if we're not applying active then this el will get in the way (opacity==0))
  const hideMenuContainerEl = () => {
    menuContainerEl.classList.remove('show');
    menuContainerEl.style.removeProperty('transform');
    menuContainerEl.style.removeProperty('transition');
  };

  // get a single dimension set from a navLink el
  const getDimension = (navLink, menuEL, isDesktop, menu) => {
    showMenuContainerEl();

    // record as dimension obj
    const dimension = {};

    // pull info from doc to find the bounding to position the menu content/background/caret
    const navbarRect = navbarEl.getBoundingClientRect();
    const navLinkRect = navLink.getBoundingClientRect();
    const contentRect = menuEL.getBoundingClientRect();
    const containerRect = navbarContainerEl.getBoundingClientRect();

    hideMenuContainerEl();

    // allow the menuX pos to be offset by % or px value (only using px atm - we could reduce this)
    const offsetX = (isDesktop && dimensions[menu] && dimensions[menu].moveX ? (
      Math.abs(dimensions[menu].moveX) > 1 ? dimensions[menu].moveX : window.innerWidth * dimensions[menu].moveX
    ) : 0);

    dimension.width = contentRect.width;
    dimension.height = contentRect.height;
    dimension.arrowX = navLinkRect.left + (navLinkRect.width / 2) - navbarRect.left;
    dimension.menuX = dimension.arrowX - 66 + offsetX;
    dimension.menuY = navLinkRect.bottom - containerRect.y;

    return dimension;
  };

  // measure the submenu's dimensions
  const getSubmenuDimensions = (menu) => {
    showMenuContainerEl();

    // position of the upperRight boundary
    dimensions[`${menu}Submenu-decreasingCorner`] = {
      x: dimensions[menu].menuX + menuElsByName[menu].clientWidth,
      y: dimensions[menu].menuY - 400
    };

    // position of the lowerRight boundary
    dimensions[`${menu}Submenu-increasingCorner`] = {
      x: dimensions[menu].menuX + menuElsByName[menu].clientWidth,
      y: dimensions[menu].menuY + menuElsByName[menu].clientHeight + 400
    };

    hideMenuContainerEl();
  };

  // set the dimensions for each navLinks menu
  const setDimensions = () => {
    // get dimensions of all navLinks
    navLinkEls.forEach((navLink) => {
      // get the menu name from the navLink
      const menu = navLink.dataset.menu;

      // combine/fill the dimensions with new measurments
      dimensions[menu] = {
        ...(dimensions[menu] ? dimensions[menu] : {}),
        ...getDimension(navLink, menuElsByName[menu], true, menu)
      };
    });
    // get the dimensions for each submenu
    [...submenuEls].forEach((el) => getSubmenuDimensions(el.dataset.submenu));
  };

  // remove isVisible transitions to reduce jank
  const resetVisibility = () => {
    // removing isVisible will reset transition to just opacity
    backgroundEl.classList.remove('isVisible');
    contentEl.classList.remove('isVisible');
    caretEl.classList.remove('isVisible');
    // close the dropdown to animate out
    menuContainerEl.classList.remove('open');
    // remove .show after the transitions finishes
    setTimeout(() => {
      menuContainerEl.classList.remove('show');
    }, transitionDuration);
  };

  // clean up recorded dimensions and display state of the menu
  const cleanUp = () => {
    resetVisibility();

    // remove prev .active state
    menuEls.forEach(el => {
      el.style.cssText = 'transition:unset;';
      el.classList.remove('show');
      el.classList.remove('active');
      el.style.cssText = '';
    });
    spacerEls.forEach(el => el.classList.remove('active'));
    navItemEls.forEach(el => el.classList.remove('active'));

    // remove current positions so that nothings offpage
    menuContainerEl.style.cssText = 'transition:unset;';
    backgroundEl.style.cssText = 'transition:unset;';
    contentEl.style.cssText = 'transition:unset;';
    caretEl.style.cssText = 'transition:unset;';
  };

  // toggle display of menu dropdown (triggered on hover - content is moved and background is scaled)
  const showMenu = (navLink) => {
    // get menu name from navLink
    const menu = navLink.dataset.menu;

    // focus the element (to show :focus state on hover)
    navLink.focus();

    // mark menu open
    menuContainerEl.classList.add('show');

    // mark first .gc-menu-submenu as .active (if .active is not set on pageload)
    if (menuElsByName[menu].dataset.submenu && menuElsByName[menu].querySelectorAll('.gc-menu-submenu.active').length == 0) {
      menuElsByName[menu].querySelector('.gc-menu-submenu').classList.add('active');
    }

    // wait for .show paint (waiting for display: block)
    window.requestAnimationFrame(() => {
      // add open to set opacity and to transition the rotateX
      menuContainerEl.classList.add('open');
      // remove prev active state
      menuEls.forEach(el => el.classList.remove('active'));
      // mark this menu as active
      menuElsByName[menu].classList.add('active');

      // clear disable transition
      caretEl.style.cssText = '';
      contentEl.style.cssText = '';
      backgroundEl.style.cssText = '';
      menuContainerEl.style.cssText = '';

      // hide bs dropdowns
      $('.nav-link.dropdown-toggle').dropdown('hide');

      // resize and position background (use scale to avoid janky transitions)
      backgroundEl.style.transform = `
        translateX(${ dimensions[menu].menuX }px)
        scaleX(${ dimensions[menu].width / (window.innerWidth * 0.60) })
        scaleY(${ dimensions[menu].height / (window.innerHeight * 0.50) })`;

      // resize and position content (we need to use width/height here but jank is hidden by the background)
      contentEl.style.width = dimensions[menu].width + 'px';
      contentEl.style.height = dimensions[menu].height + 'px';
      contentEl.style.transform = `
        translateX(${ dimensions[menu].menuX }px)`;

      // position caret
      caretEl.style.transform = `
        translateX(${ dimensions[menu].arrowX }px)
        rotate(45deg)`;

      // add isVisible to enable transform animations between menus
      setTimeout(() => {
        caretEl.classList.add('isVisible');
        contentEl.classList.add('isVisible');
        backgroundEl.classList.add('isVisible');
      }, transitionDuration);
    });
  };

  // toggle display of menus for mobile
  const showMenuMobile = (navLink) => {
    // get menu name from navLink
    const menu = navLink.dataset.menu;
    // get menuEl + menuSpacer so we can move menuEl into menuSpacer space
    const menuEl = menuElsByName[menu];
    const menuSpacer = spacerElsByName[menu];
    // check if its already been opened (is .active)
    const isActive = menuSpacer.classList.contains('active');

    // remove prev .active state(s)
    cleanUp();

    // hide bs dropdowns
    $('.nav-link.dropdown-toggle').dropdown('hide');

    // open if not already active (else we're closing)
    if (!isActive) {
      // display the el
      menuEl.classList.add('show');
      // wait for .show to paint
      window.requestAnimationFrame(() => {
        // mark this menu as active
        menuEl.classList.add('active');
        menuSpacer.classList.add('active');
        navLink.parentElement.classList.add('active');

        // get the dimensions for just this menu (doing this each call so that the expanded (active) state is measured)
        const dimension = getDimension(navLink, menuEl);

        // set spacers height
        menuSpacer.style.height = `${ dimension.height }px`;
        // cleanUp menuEl before adding new css
        menuEl.style.cssText = '';
        // resize and position content (on top of the spacer)
        menuEl.style.top = `${ dimension.menuY + navbarContainerEl.scrollTop }px`;
        menuEl.style.height = `${ dimension.height }px`;
      });
    }
  };

  // calculate the slope from current pos to top-right/bottom-right
  const slope = (a, b) => (b.y - a.y) / (b.x - a.x);

  // record mousePositions for each movement over submenus container
  const pushMousePosition = (e, menu) => {
    // push the positions taken from the event
    mousePositions[menu].push({
      x: e.pageX,
      y: e.pageY
    });
    // ensure the arr is no longer than 2 entries
    if (mousePositions[menu].length > 2)
      mousePositions[menu].shift();
  };

  // show the specified submenu
  const showSubmenu = (e, menu, submenuToggle) => {
    // dont follow click if touched
    e.preventDefault();
    e.stopPropagation();
    // fix/remove hover state on toggle
    submenuToggleEls[menu].forEach(el => el.classList.remove('gc-menu-submenu-toggle-focus'));
    submenuToggle.classList.add('gc-menu-submenu-toggle-focus');
    // show/hide submenu
    submenuMenuEls[menu].forEach(el => el.classList.remove('active'));
    submenuMenuElsByName[menu][submenuToggle.dataset.submenu].classList.add('active');
  };

  // check to ensure that the mouse movement was a deliberate attempt to open a submenu
  const hysteresisCheck = (e, menu, submenuToggle) => {
    // clear prev action
    if (debounceSubmenuFocus[menu])
      clearTimeout(debounceSubmenuFocus[menu]);
    // ensure mousePositions are set
    if (mousePositions[menu][0] && mousePositions[menu][1]) {
      // check the slope of the most recent mouse movements - we only want to activate the submenu if the action is deliberate
      const decreasingSlope = slope(mousePositions[menu][1], dimensions[`${menu}Submenu-decreasingCorner`]);
      const increasingSlope = slope(mousePositions[menu][1], dimensions[`${menu}Submenu-increasingCorner`]);
      const prevDecreasingSlope = slope(mousePositions[menu][0], dimensions[`${menu}Submenu-decreasingCorner`]);
      const prevIncreasingSlope = slope(mousePositions[menu][0], dimensions[`${menu}Submenu-increasingCorner`]);

      // check if we should delay the change of menu
      if (decreasingSlope < prevDecreasingSlope && increasingSlope > prevIncreasingSlope) {
        debounceSubmenuFocus[menu] = setTimeout(() => showSubmenu(e, menu, submenuToggle), 300);
      } else {
        showSubmenu(e, menu, submenuToggle);
      }
    } else {
      showSubmenu(e, menu, submenuToggle);
    }
  };

  // scroll to the start of the menu/close if we move out of mobile
  const posMobileMenu = () => {
    if (document.body.classList.contains('navbar-menu-open')) {
      // get the top pos of the nav so that we can check if we need to scroll it into view (navBar is 100vh)
      navPos = Math.ceil(window.scrollY + navbarContainerEl.getBoundingClientRect().top);
      // scroll beyond the topNav and lock
      if (window.innerWidth >= breakpoint_md) {
        // close menu if we move into md
        navPos = 0;
        $navbarSupportedContent.collapse('hide');
        document.body.classList.remove('navbar-menu-open');
      } else if (navPos !== 0) {
        window.scrollTo(0, navPos);
      }
    }
  };

  // debounce the resize/orientationchange event
  const bindPosMobileMenu = (eventName) => {
    window.addEventListener(eventName, () => {
      posMobileMenu();
    });
  };


  // set initial positions for each nav item
  setDimensions();


  // add .navbar-menu-open to prevent page-scroll when mobile menu is opened
  $navbarSupportedContent.on('show.bs.collapse', () => {
    anchored = window.scrollY;
    document.body.classList.add('navbar-menu-open');
    posMobileMenu();
  }).on('hide.bs.collapse', () => {
    document.body.classList.remove('navbar-menu-open');
    window.scrollTo(0, anchored);
    anchored = 0;
  });

  // bindPosMobileMenu for each eventName
  [ 'resize', 'orientationchange' ].forEach((eventName) => {
    bindPosMobileMenu(eventName);
  });

  // cleanUp on resize (remove active state and remeasure the dimensions)
  window.addEventListener('resize', () => {
    // debounce the measure
    clearTimeout(debounceMeasure);
    // reinit the cleanup
    debounceMeasure = setTimeout(() => {
      // cleanUp
      cleanUp();
      // only alter dimensions on resive for desktop version
      if (window.innerWidth >= breakpoint_md) {
        // set the new positions
        setDimensions();
      }
    }, 30);
  });

  // set mouseenter events on each navLink
  navLinkEls.forEach((navLink) => {
    navLink.addEventListener('mouseenter', () => {
      // show the selection
      if (window.innerWidth >= breakpoint_md)
        showMenu(navLink);
    });
    navLink.addEventListener('click', (e) => {
      // prevent href from scrolling to top
      e.preventDefault();
      // show the selection
      if (window.innerWidth >= breakpoint_md) {
        showMenu(navLink);
      } else {
        showMenuMobile(navLink);
      }
    });
  });

  // cleanup and attach event to close gc-menu on bs-dropdown open
  mobileToggleEl.addEventListener('click', () => {
    // remove any open/active state
    cleanUp();
    // wait for vue to finish paint
    window.requestAnimationFrame(() => {
      // bind click event to hide items when bootstrap menu is opened (bind on toggle so that we're definately ready)
      $('.nav-link.dropdown-toggle[data-toggle="dropdown"]').each((_, el) => {
        $(el).off('click.gc-menu').on('click.gc-menu', () => window.innerWidth < breakpoint_md && cleanUp());
      });
    });
  });

  // set mouseleave event on whole navbar el (how long to stay open after mouseleave)
  navbarEl.addEventListener('mouseleave', () => {
    if (window.innerWidth >= breakpoint_md) {
      debounceClose = setTimeout(() => {
        // remove isVisible transitions to reduce jank
        resetVisibility();
      }, 1000);
    }
  });

  // if mouse re-enters the navbar clear the timeout
  navbarEl.addEventListener('mouseenter', () => {
    if (window.innerWidth >= breakpoint_md) {
      // quit the close routine
      clearTimeout(debounceClose);
    }
  });

  // set-up each of the defined submenus
  [...submenuEls].forEach((el) => {
    // collect the submenu name (as data attr on .gc-menu-wrap el)
    const menu = el.dataset.submenu;

    // associate mousePos arr (collected for each menu)
    mousePositions[menu] = [];

    // record each mouseMove on the whole dropdown area
    menuElsByName[menu].addEventListener('mousemove', (e) => {
      pushMousePosition(e, menu);
    });

    // show submenu content on hover of gc-menu-submenu-toggle
    submenuToggleEls[menu].forEach((submenuToggle) => {
      submenuToggle.addEventListener((isTouchDevice ? 'touchstart' : 'mouseenter'), (e) => {
        // disallow touch actions from following links unless its the second touch (submenu only applied to desktop)
        if (window.innerWidth >= breakpoint_md) {
          if (!isTouchDevice) {
            hysteresisCheck(e, menu, submenuToggle);
          } else if (isTouchDevice && !submenuToggle.classList.contains('gc-menu-submenu-toggle-focus')) {
            showSubmenu(e, menu, submenuToggle);
          }
        }
      });
      // stop hysteresisCheck from activating menus after we'e left the submenuToggle area
      submenuToggle.addEventListener('mouseleave', (e) => {
        clearTimeout(debounceSubmenuFocus[menu]);
      });
    });
  });

});
