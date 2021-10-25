import { assert, expect } from "chai";
import {
    Caching,
    CachingPessimisticRefresh,
    BearerToken,
    Queryable,
    InjectHeaders,
    Timeout,
    ThrowErrors,
} from "@pnp/queryable";
import { spfi } from "@pnp/sp";
import { SPDefault } from "@pnp/nodejs";
import { AbortController } from "node-abort-controller";
import { default as nodeFetch } from "node-fetch";

import { testSettings } from "../main.js";
import "@pnp/sp/webs";


describe("Behaviors", function () {

    if (testSettings.enableWebTests) {

        it("CachingPessimistic", async function () {
            try {
                // Testing a behavior, creating new instance of sp
                const spInstance = spfi(testSettings.sp.testWebUrl).using(SPDefault({
                    msal: {
                        config: testSettings.sp.msal.init,
                        scopes: testSettings.sp.msal.scopes,
                    },
                })).using(CachingPessimisticRefresh("session"));

                // Test caching behavior
                const startCheckpoint = new Date();
                const u = await spInstance.web();
                const midCheckpoint = new Date();
                const u2 = await spInstance.web();
                const endCheckpoint = new Date();

                // Results should be the same
                const test1 = JSON.stringify(u) === JSON.stringify(u2);

                // Assume first call should take longer as it's not cached
                const call1Time = (midCheckpoint.getTime() - startCheckpoint.getTime());
                const call2Time = (endCheckpoint.getTime() - midCheckpoint.getTime());
                const test2 = call1Time > call2Time;
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                expect(test1 && test2).to.be.true;
            } catch (err) {
                assert.fail(`Behaviors/Queryable/CachingPessimistic - ${err.message}`);
            }
        });

        it("Caching", async function () {
            try {
                // Testing a behavior, creating new instance of sp
                const spInstance = spfi(testSettings.sp.testWebUrl).using(SPDefault({
                    msal: {
                        config: testSettings.sp.msal.init,
                        scopes: testSettings.sp.msal.scopes,
                    },
                })).using(Caching("session"));

                // Test caching behavior
                const startCheckpoint = new Date();
                const u = await spInstance.web();
                const midCheckpoint = new Date();
                const u2 = await spInstance.web();
                const endCheckpoint = new Date();

                // Results should be the same
                const test1 = JSON.stringify(u) === JSON.stringify(u2);

                // Assume first call should take longer as it's not cached
                const call1Time = (midCheckpoint.getTime() - startCheckpoint.getTime());
                const call2Time = (endCheckpoint.getTime() - midCheckpoint.getTime());
                const test2 = call1Time > call2Time;
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                expect(test1 && test2).to.be.true;
            } catch (err) {
                assert.fail(`Behaviors/Queryable/Caching - ${err.message}`);
            }
        });
    }

    it("Bearer Token", async function () {

        const query = new Queryable("https://bing.com");
        query.using(BearerToken("!!token!!"));

        query.on.send.replace((url, init) => {

            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            expect(init.headers).to.not.be.undefined.and.to.not.be.null;

            expect(init.headers).to.have.property("Authorization", "Bearer !!token!!");

            return null;
        });

        return query();
    });

    it("Inject Headers", async function () {

        const query = new Queryable("https://bing.com");
        query.using(InjectHeaders({
            "header1": "header1-value",
            "header2": "header2-value",
        }));

        query.on.send.replace((url, init) => {

            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            expect(init.headers).to.not.be.undefined.and.to.not.be.null;

            expect(init.headers).to.have.property("header1", "header1-value");

            expect(init.headers).to.have.property("header2", "header2-value");

            return null;
        });

        return query();
    });

    it("Timeout", async function () {

        // must patch in node < 15
        const controller = new AbortController();

        const query = new Queryable("https://bing.com");
        query.using(Timeout(controller.signal));

        query.on.send.replace(async (url, init) => nodeFetch(url, init));

        query.using(ThrowErrors());

        try {

            controller.abort();
            await query();

            expect.fail("Timeout should cause error and we end up in catch before this line.");

        } catch (e) {

            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            expect(e).to.not.be.null;

            expect(e).property("name").to.not.eq("AssertionError");
        }
    });
});