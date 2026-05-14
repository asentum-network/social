import Head from 'next/head';
import Layout from '../components/Layout';
import SettingsPage from '../components/SettingsPage';

export default function Settings() {
  return (
    <>
      <Head>
        <title>Settings · asentum</title>
      </Head>
      <Layout>
        <SettingsPage />
      </Layout>
    </>
  );
}
