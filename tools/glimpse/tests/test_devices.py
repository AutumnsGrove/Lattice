"""Tests for glimpse.utils.devices — device viewport presets."""

from glimpse.utils.devices import get_device, list_devices, DEVICES, DEVICE_NAMES


class TestGetDevice:
    def test_iphone(self):
        d = get_device("iphone")
        assert d is not None
        assert d["width"] == 390
        assert d["height"] == 844
        assert d["scale"] == 3

    def test_ipad(self):
        d = get_device("ipad")
        assert d is not None
        assert d["width"] == 820
        assert d["height"] == 1180

    def test_case_insensitive(self):
        assert get_device("iPhone") == get_device("iphone")
        assert get_device("IPAD") == get_device("ipad")

    def test_aliases(self):
        """mobile and phone should alias to iphone."""
        assert get_device("mobile") == get_device("iphone")
        assert get_device("phone") == get_device("iphone")

    def test_desktop(self):
        d = get_device("desktop")
        assert d["width"] == 1920
        assert d["height"] == 1080

    def test_unknown_returns_none(self):
        assert get_device("nokia-3310") is None
        assert get_device("") is None

    def test_all_presets_have_required_keys(self):
        for name, preset in DEVICES.items():
            assert "width" in preset, f"{name} missing width"
            assert "height" in preset, f"{name} missing height"
            assert "scale" in preset, f"{name} missing scale"
            assert preset["width"] > 0
            assert preset["height"] > 0
            assert 1 <= preset["scale"] <= 4


class TestListDevices:
    def test_returns_tuples(self):
        devices = list_devices()
        assert len(devices) > 0
        for name, w, h, s in devices:
            assert isinstance(name, str)
            assert isinstance(w, int)
            assert isinstance(h, int)
            assert isinstance(s, int)

    def test_sorted(self):
        devices = list_devices()
        names = [d[0] for d in devices]
        assert names == sorted(names)


class TestDeviceNames:
    def test_includes_common_devices(self):
        assert "iphone" in DEVICE_NAMES
        assert "ipad" in DEVICE_NAMES
        assert "mobile" in DEVICE_NAMES
        assert "desktop" in DEVICE_NAMES
        assert "tablet" in DEVICE_NAMES
