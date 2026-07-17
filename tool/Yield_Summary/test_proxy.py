import unittest
from socketserver import ThreadingMixIn

import proxy


class ProxyServerTests(unittest.TestCase):
    def test_proxy_server_handles_requests_concurrently(self):
        self.assertTrue(issubclass(proxy.ProxyServer, ThreadingMixIn))


if __name__ == "__main__":
    unittest.main()
