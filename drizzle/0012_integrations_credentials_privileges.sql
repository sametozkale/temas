-- docs/03 §8: integrations.credentials is service-role only.
REVOKE ALL ("credentials") ON TABLE "integrations" FROM anon, authenticated;
