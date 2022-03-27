import React, { useEffect, useState, useMemo, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { graphql, Link } from "gatsby";
import slugify from "slugify";
import useWindowSize from "../hooks/useWindowSize";

import { decryptBuffer, createBlobUrl } from "../utils/crypto";
import { fetchWithRetries } from "../utils/fetch";
import Layout from "../components/Layout";
import Image from "../components/Image";

import * as styles from "./index.module.css";

export default function PageIndex(props) {
  const { thumbnails } = props.data;
  const { height: windowHeight } = useWindowSize();
  const episodeThumbnails = useMemo(() => {
    const arr = [];
    let prevEpisodeName = null;
    for (const { node } of thumbnails.edges) {
      const [episodeName] = node.relativePath.split("/");
      if (episodeName !== prevEpisodeName) {
        arr.push([]);
        prevEpisodeName = episodeName;
      }
      arr[arr.length - 1].push(node);
    }
    return arr;
  }, [thumbnails]);

  return (
    <Layout>
      <div className={styles.container}>
        {episodeThumbnails.map((thumbnails, index) => {
          const relativePath = thumbnails[0].relativePath;
          const episodeName = `Episode ${relativePath.split("/")[0]}`;

          return (
            <Link
              className={styles.episode}
              to={`/${slugify(relativePath.split("/")[0].toLowerCase())}`}
              key={index}
            >
              {thumbnails.map((thumbnail) => {
                const [_, width, height] = thumbnail.name.split("-");
                return (
                  <Thumbnail
                    key={thumbnail.publicURL}
                    width={parseInt(width, 10)}
                    height={parseInt(height, 10)}
                    publicURL={thumbnail.publicURL}
                    windowHeight={windowHeight}
                  />
                );
              })}
              <p className={styles.episodeTitle}>{episodeName}</p>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}

function Thumbnail(props) {
  const { width, height, publicURL, windowHeight } = props;
  const ratio = height / width;
  const [imageBuffer, setImageBuffer] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const onceRef = useRef(false);
  const { ref, inView } = useInView({
    rootMargin: `${windowHeight * 5}px 0px ${windowHeight * 5}px`,
  });

  useEffect(() => {
    async function fetchImage() {
      const res = await fetchWithRetries(publicURL, 1000, 5);
      const buffer = await res.arrayBuffer();
      setImageBuffer(decryptBuffer(buffer));
    }
    if (inView && !onceRef.current) {
      fetchImage();
      onceRef.current = true;
    }
  }, [inView]);

  useEffect(() => {
    if (inView) {
      setBlobUrl(createBlobUrl(imageBuffer));
    }

    return () => {
      if (blobUrl != null) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [imageBuffer, inView]);

  return (
    <div className={styles.thumbnail} ref={ref}>
      <div
        className={styles.thumbnailPadding}
        style={{
          paddingTop: `${ratio * 100}%`,
        }}
      />
      {inView && blobUrl != null ? (
        <Image className={styles.thumbnailImage} src={blobUrl} />
      ) : null}
    </div>
  );
}

export const pageQuery = graphql`
  query {
    thumbnails: allFile(
      sort: { fields: dir }
      filter: { name: { regex: "/^thumbnail/" } }
    ) {
      edges {
        node {
          publicURL
          relativePath
          name
        }
      }
    }
  }
`;
