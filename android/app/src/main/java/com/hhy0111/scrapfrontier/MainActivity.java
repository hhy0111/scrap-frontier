package com.hhy0111.scrapfrontier;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScrapFrontierCommercePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
