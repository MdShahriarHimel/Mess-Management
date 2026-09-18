package com.messmanagement.app;

import org.junit.Test;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class NavigationPolicyTest {
    private final NavigationPolicy policy = new NavigationPolicy("https://mess.example.com");

    @Test
    public void keepsOnlyTheWebsiteHttpsOriginInsideTheApp() {
        assertTrue(policy.isWebsite("https://mess.example.com/meals?month=2026-09"));
        assertTrue(policy.isWebsite("https://MESS.example.com:443/#dashboard"));
        assertFalse(policy.isWebsite("http://mess.example.com"));
        assertFalse(policy.isWebsite("https://mess.example.com:8443"));
        assertFalse(policy.isWebsite("https://mess.example.com.attacker.example"));
        assertFalse(policy.isWebsite("https://mess.example.com@attacker.example"));
        assertFalse(policy.isWebsite("https://attacker.example@mess.example.com"));
        assertFalse(policy.isWebsite(null));
        assertFalse(policy.isWebsite("not a URL"));
    }

    @Test
    public void rejectsExecutableAndLocalExternalUrls() {
        assertTrue(NavigationPolicy.canOpenExternally("https://example.com/report"));
        assertTrue(NavigationPolicy.canOpenExternally("mailto:member@example.com"));
        assertTrue(NavigationPolicy.canOpenExternally("tel:+880123456789"));
        assertFalse(NavigationPolicy.canOpenExternally("javascript:alert(1)"));
        assertFalse(NavigationPolicy.canOpenExternally("file:///data/local/file"));
        assertFalse(NavigationPolicy.canOpenExternally("intent://example"));
        assertFalse(NavigationPolicy.canOpenExternally("data:text/html,test"));
        assertFalse(NavigationPolicy.canOpenExternally("http://example.com"));
        assertFalse(NavigationPolicy.canOpenExternally("https://example.com@attacker.example"));
        assertFalse(NavigationPolicy.canOpenExternally(null));
    }
}
