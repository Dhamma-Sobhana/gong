# Gong Status Screen

Wall mounted tablet for displaying system status and allow basic configuration.

## Device settings

* Lock screen disabled
* Brightness lowered.

## Kiosk software

A licensed version of [Android Kiosk Browser](https://www.android-kiosk.com/) is installed on a Android tablet running Android 7 or later.

To access Android Kiosk Browser settings, tap the screen 4 times and enter password.

### Custom error page

For the custom error screen to work copy `index.htm` and `unavailable.png` from [kioskbrowser/errorpage]() to `kioskbrowser/errorpage` on the device.

### Configuration

Restore configuration from [`configuration.json`]() to get most settings correct.

Open Settings and go to *Advanced, Automatic Config Url*.

Fill in URL: ``

Settings needing change after restore:

#### General, Kiosk URL
Set to the IP or hostname of the server, including http://

#### Allow/Block List, Allowed URLs

Same as **Kiosk URL**.

#### Admin, Settings Password

Password for accessing these settings.